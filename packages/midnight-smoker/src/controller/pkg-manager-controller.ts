/**
 * Provides {@link PkgManagerController}, which is sort of a controller for
 * {@link PkgManager}s.
 *
 * @packageDocumentation
 */

import {
  ComponentKinds,
  DEFAULT_EXECUTOR_ID,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {
  CleanupError,
  InstallError,
  PackError,
  PackParseError,
  PackageManagerError,
  ScriptBailed,
} from '#error';
import {
  SmokerEvent,
  buildInstallEventData,
  buildPackBeginEventData,
  buildPackOkEventData,
  buildRunScriptsBeginEventData,
  buildRunScriptsEndEventData,
  type InstallEvents,
  type PackEvents,
  type ScriptEvents,
  type SmokerEventBus,
} from '#event';
import {
  PkgManager,
  type PkgManagerSpec,
  type RunScriptResult,
  type SomePkgManager,
} from '#pkg-manager';
import {type PluginMetadata, type PluginRegistry} from '#plugin';
import {
  type Executor,
  type PackOptions,
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerOpts,
  type RunScriptManifest,
} from '#schema';
import {isErrnoException, once} from '#util';
import {FileManager, type FileManagerOpts} from '#util/filemanager';
import Debug from 'debug';
import {isError} from 'lodash';
import {type Controller} from './controller';

/**
 * All events emitted by the {@link PkgManagerController} class.
 */
export type PkgManagerEvents = InstallEvents & ScriptEvents & PackEvents;
export type PluginPkgManagerDef = [
  plugin: Readonly<PluginMetadata>,
  def: PkgManagerDef,
];
export type RunScriptManifestWithPkgMgr = RunScriptManifest & {
  pkgManager: PkgManager;
};

/**
 * Options for the {@link PkgManagerController} class.
 */
export interface PkgManagerControllerOpts {
  cwd?: string;
  defaultExecutorId?: string;
  systemExecutorId?: string;

  fileManagerOpts?: FileManagerOpts;

  linger?: boolean;
}

/**
 * Options for {@link PkgManagerController.runScripts}
 */
export interface PkgManagerControllerRunScriptsOpts {
  /**
   * If `true`, halt execution of scripts on the first failure.
   */
  bail?: boolean;
}

/**
 * Provides an interface to components interacting with `PkgManager`s.
 *
 * Responsible for acting as an event bus.
 *
 * The `PkgManagerController` should _not_ be responsible for passing an
 * `Executor` around, nor should it concern itself with `RuleRunner`s.
 *
 * @internal
 */
export class PkgManagerController implements Controller {
  #pkgManagers: SomePkgManager[] = [];

  public readonly cwd: string;
  public readonly defaultExecutor: Executor;
  public readonly pkgManagerOpts: PkgManagerOpts;
  public readonly systemExecutor: Executor;

  public readonly linger: boolean;

  #fm: FileManager;

  public constructor(
    private readonly pluginRegistry: PluginRegistry,
    private readonly eventBus: SmokerEventBus,
    private readonly desiredPkgManagers: string[] = [],
    opts: PkgManagerControllerOpts & PkgManagerOpts = {},
  ) {
    const {
      defaultExecutorId = DEFAULT_EXECUTOR_ID,
      systemExecutorId = SYSTEM_EXECUTOR_ID,
      cwd = process.cwd(),
      fileManagerOpts,
      linger,
      ...pkgManagerOpts
    } = opts;
    this.linger = Boolean(linger);
    this.defaultExecutor = this.pluginRegistry.getExecutor(defaultExecutorId);
    this.systemExecutor = this.pluginRegistry.getExecutor(systemExecutorId);
    this.cwd = cwd;
    this.pkgManagerOpts = pkgManagerOpts;
    this.#fm = new FileManager(fileManagerOpts);
  }

  public get pkgManagers() {
    if (!this.#pkgManagers.length) {
      debug('Warning: pkgManagers accessed before initialization!');
    }
    return this.#pkgManagers;
  }

  public static create(
    pluginRegistry: PluginRegistry,
    eventBus: SmokerEventBus,
    desiredPkgManagers: string[] = [],
    opts: PkgManagerControllerOpts & PkgManagerOpts = {},
  ) {
    return new PkgManagerController(
      pluginRegistry,
      eventBus,
      desiredPkgManagers,
      opts,
    );
  }

  /**
   * Creates a _base_ {@link PkgManagerContext} object for the given spec.
   *
   * When passing the result to a `PkgManager` instance method, create a new
   * object based on this `PkgManagerContext` with any extra properties needed.
   *
   * @param spec Spec for context
   * @param opts PkgManagerOpts
   * @returns Minimal `PkgManagerContext`
   * @internal
   */
  public async createPkgManagerContext(
    spec: PkgManagerSpec,
    opts: PkgManagerOpts = {},
  ): Promise<PkgManagerContext> {
    const tmpdir = await this.#fm.createTempDir(
      `${spec.pkgManager}-${spec.version}`,
    );
    const executor = this.executorForSpec(spec);
    return {
      spec,
      tmpdir,
      executor,
      ...opts,
    };
  }

  /**
   * Executes {@link PkgManager.teardown} of each `PkgManager`, then runs cleanup
   * on temp dirs (based on {@link PkgManagerController.linger})
   */
  public async destroy() {
    this.pkgManagers; //?
    await Promise.all(
      this.pkgManagers.map((pkgManager) => pkgManager.teardown()),
    );
    if (!this.linger) {
      await Promise.all(
        this.pkgManagers.map(async (pm) => {
          const {tmpdir} = pm;
          try {
            await this.#fm.rimraf(tmpdir);
          } catch (err) {
            if (isErrnoException(err)) {
              if (err.code !== 'ENOENT') {
                throw new CleanupError(
                  `Failed to clean temp directory ${tmpdir}`,
                  tmpdir,
                  err,
                );
              }
            } else {
              throw err;
            }
          }
        }),
      );
    } else if (this.pkgManagers.length) {
      const lingered = this.pkgManagers.map((pm) => pm.tmpdir);
      debug('Leaving %d temp dirs on disk: %O', lingered.length, lingered);
      await this.eventBus.emit(SmokerEvent.Lingered, {directories: lingered});
    }
  }

  @once
  public async init() {
    const {cwd, desiredPkgManagers, pkgManagerOpts} = this;
    const {plugins} = this.pluginRegistry;
    const createPkgManagerContext = this.createPkgManagerContext.bind(this);
    const getComponent = this.pluginRegistry.getComponent.bind(
      this.pluginRegistry,
    );
    const registerComponent = this.pluginRegistry.registerComponent.bind(
      this.pluginRegistry,
    );

    // this is an async generator because of the nested loop, which is not
    // conducive to mapping via `Promise.all`
    async function* initPkgManagers() {
      for (const plugin of plugins) {
        const pkgManagerDefSpecs = await plugin.loadPkgManagers({
          cwd,
          desiredPkgManagers,
        });
        for (const {spec, def} of pkgManagerDefSpecs) {
          const ctx = await createPkgManagerContext(spec, pkgManagerOpts);
          const {id, componentName} = getComponent(def);
          registerComponent(
            plugin,
            ComponentKinds.PkgManager,
            def,
            componentName,
          );
          yield PkgManager.create(id, def, plugin, ctx);
        }
      }
    }

    const pkgManagers: SomePkgManager[] = [];
    for await (const pkgManager of initPkgManagers()) {
      pkgManagers.push(pkgManager);
    }
    this.#pkgManagers = pkgManagers;
    debug('Initialized %d pkg managers', pkgManagers.length);
  }

  /**
   * The intent here is to track the total and count of each package installed
   * and emit it.
   *
   * The `total` and `current` props of the `RunScriptBegin` event are
   * considered optional and will be filled in by this function
   *
   * @param installManifests
   * @returns
   * @internal
   * @todo AbortController
   */
  public async install(additionalDeps: string[] = []): Promise<void> {
    const pkgManagers = this.pkgManagers;

    for (const additionalDep of additionalDeps) {
      for (const pkgManager of pkgManagers) {
        pkgManager.addAdditionalDep(additionalDep);
      }
    }

    const eventData = buildInstallEventData(pkgManagers);

    // this increments by the number of install manifests for each PM
    let current = 0;

    await this.eventBus.emit(SmokerEvent.InstallBegin, eventData);

    await Promise.all(
      pkgManagers.map(async (pkgManager) => {
        try {
          await pkgManager.install();
        } catch (err) {
          if (err instanceof InstallError) {
            await this.eventBus.emit(SmokerEvent.InstallFailed, {
              ...eventData,
              current,
              error: err,
            });
          }
          throw err;
        }
        await this.eventBus.emit(SmokerEvent.InstallOk, {
          ...eventData,
          current: (current += pkgManager.installManifests.length),
        });
      }),
    );
  }

  /**
   * Packs the project and/or workspaces in the current working directory using
   * all available package managers.
   *
   * @param opts The options for the pack operation.
   * @returns A promise that resolves to an array of `PkgManagerInstallManifest`
   *   objects.
   * @internal
   * @todo Ensure `#installManifests` is empty when this is called
   */
  public async pack(opts: PackOptions = {}): Promise<void> {
    const pkgManagers = this.pkgManagers;

    const eventData = buildPackBeginEventData(pkgManagers);

    await this.eventBus.emit(SmokerEvent.PackBegin, eventData);

    await Promise.all(
      pkgManagers.map(async (pkgManager) => {
        try {
          await pkgManager.setup().then(() => pkgManager.pack(opts));
        } catch (err) {
          if (err instanceof PackError || err instanceof PackParseError) {
            await this.eventBus.emit(SmokerEvent.PackFailed, {
              ...eventData,
              error: err,
            });
          }
          throw err;
        }
      }),
    );

    await this.eventBus.emit(
      SmokerEvent.PackOk,
      buildPackOkEventData(pkgManagers),
    );
  }

  private async runScript(
    pkgManager: PkgManager,
    runManifest: RunScriptManifest,
    signal: AbortSignal,
  ): Promise<RunScriptResult> {
    if (signal?.aborted) {
      throw new ScriptBailed();
    }

    let result: RunScriptResult;
    const {script, pkgName} = runManifest;

    try {
      debug('Running script "%s" in package %s', script, pkgName);
      result = await pkgManager.runScript(runManifest, signal);
    } catch (err) {
      if (err instanceof ScriptBailed) {
        throw err;
      }
      if (isError(err)) {
        throw new PackageManagerError(
          `Package manager "${pkgManager.spec}" failed to run script "${script}": ${err.message}`,
          pkgManager.spec,
          err,
        );
      }
      throw err;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signal?.aborted) {
      throw new ScriptBailed();
    }

    return result;
  }

  /**
   * Runs the specified scripts for each package & package manager in the
   * provided {@link InstallResult} array.
   *
   * Handles emitting all events in {@link ScriptEvents}.
   *
   * @param scripts - An array of scripts to run.
   * @param installResults - An array of install results.
   * @param opts - Options controlling run behavior.
   * @returns A promise that resolves to an array of run script results.
   * @todo Support specific script runner
   */
  public async runScripts(
    scripts: string[],
    opts: PkgManagerControllerRunScriptsOpts,
  ): Promise<RunScriptResult[]> {
    const ac = new AbortController();

    let total = 0;
    let current = 0;
    const runManifestsByPkgManager = new Map<PkgManager, RunScriptManifest[]>(
      this.pkgManagers.map((pkgManager) => {
        const {pkgInstallManifests} = pkgManager;
        const runManifests: RunScriptManifest[] = pkgInstallManifests.flatMap(
          ({installPath: cwd, pkgName}) =>
            scripts.map((script) => ({script, cwd, pkgName})),
        );
        total += runManifests.length;
        return [pkgManager, runManifests] as [
          SomePkgManager,
          RunScriptManifest[],
        ];
      }),
    );

    const beginEvtData = buildRunScriptsBeginEventData(
      runManifestsByPkgManager,
    );

    const runScriptFailedListener = () => {
      if (opts.bail) {
        ac.abort();
      }
    };

    this.eventBus.onSync(SmokerEvent.RunScriptFailed, runScriptFailedListener);

    await this.eventBus.emit(SmokerEvent.RunScriptsBegin, beginEvtData);

    const results: RunScriptResult[] = [];

    try {
      for (const [pkgManager, runScriptManifests] of runManifestsByPkgManager) {
        for (const runScriptManifest of runScriptManifests) {
          const eventData = {...runScriptManifest, total, current: current++};
          const {script, pkgName} = runScriptManifest;

          await this.eventBus.emit(SmokerEvent.RunScriptBegin, eventData);
          let result: RunScriptResult;
          try {
            result = await this.runScript(
              pkgManager,
              runScriptManifest,
              ac.signal,
            );
          } catch (err) {
            if (err instanceof ScriptBailed) {
              break;
            }
            if (opts.bail) {
              ac.abort();
            }
            throw err;
          }
          if (result.error) {
            debug(
              'Script "%s" failed in package "%s": %O',
              script,
              pkgName,
              result,
            );
            await this.eventBus.emit(SmokerEvent.RunScriptFailed, {
              ...eventData,
              error: result.error,
            });
          } else if (result.skipped) {
            await this.eventBus.emit(SmokerEvent.ScriptSkipped, {
              ...eventData,
              skipped: true,
            });
          } else {
            await this.eventBus.emit(SmokerEvent.RunScriptOk, {
              ...eventData,
              // TODO: fix
              rawResult: result.rawResult!,
            });
          }
          results.push(result);
        }
      }

      const endEvtData = buildRunScriptsEndEventData(beginEvtData, results);
      if (endEvtData.failed > 0) {
        await this.eventBus.emit(SmokerEvent.RunScriptsFailed, endEvtData);
      } else {
        await this.eventBus.emit(SmokerEvent.RunScriptsOk, endEvtData);
      }

      ac.abort();
      return results;
    } finally {
      this.eventBus.offSync(
        SmokerEvent.RunScriptFailed,
        runScriptFailedListener,
      );
    }
  }

  private executorForSpec(spec: PkgManagerSpec) {
    return spec.isSystem ? this.defaultExecutor : this.systemExecutor;
  }
}

const debug = Debug('midnight-smoker:pkg-manager:controller');
