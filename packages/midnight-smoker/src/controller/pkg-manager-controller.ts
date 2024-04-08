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
import {isError, sumBy} from 'lodash';
import {type Controller} from './controller';
import {PkgManagerControllerEventHelper} from './pkg-manager-controller-event-helper';

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

  #emitter: PkgManagerControllerEventHelper;

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
    this.#emitter = new PkgManagerControllerEventHelper(this.eventBus);
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

    // TODO: error handling
    await Promise.all(pkgManagers.map((pkgManager) => pkgManager.setup()));

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
    const {pkgManagers} = this;

    for (const additionalDep of additionalDeps) {
      for (const pkgManager of pkgManagers) {
        pkgManager.addAdditionalDep(additionalDep);
      }
    }

    // this increments by the number of install manifests for each PM
    let current = 0;

    await this.#emitter.installBegin({pkgManagers});

    try {
      await Promise.all(
        pkgManagers.map(async (pkgManager) => {
          try {
            await this.#emitter.pkgManagerInstallBegin({
              pkgManagers,
              pkgManager,
              current: current + pkgManager.installManifests.length,
            });
          } catch (err) {
            // FIXME: better error handling from event emits
            debug('Error emitting PkgManagerInstallBegin: %O', err);
          }
          try {
            // @ts-expect-error need signal
            await pkgManager.install();
            await this.#emitter.pkgManagerInstallOk({
              pkgManagers,
              pkgManager,
              current: current + pkgManager.installManifests.length,
            });
          } catch (err) {
            if (err instanceof InstallError) {
              await this.#emitter.pkgManagerInstallFailed({
                current: current + pkgManager.installManifests.length,
                pkgManager,
                error: err,
                pkgManagers,
              });
            }
            throw err;
          } finally {
            current += pkgManager.installManifests.length;
          }
        }),
      );
      await this.#emitter.installOk({
        pkgManagers,
      });
    } catch (err) {
      if (err instanceof InstallError) {
        await this.#emitter.installFailed({
          pkgManagers,
          error: err,
        });
      }
      throw err;
    }
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

    await this.#emitter.packBegin({pkgManagers});

    await Promise.all(
      pkgManagers.map(async (pkgManager) => {
        try {
          // @ts-expect-error need signal
          await pkgManager.pack(undefined, opts);
        } catch (err) {
          if (err instanceof PackError || err instanceof PackParseError) {
            await this.#emitter.packFailed({
              pkgManagers,
              error: err,
            });
          }
          throw err;
        }
      }),
    );

    await this.#emitter.packOk({pkgManagers});
  }

  private async runScript(
    pkgManager: PkgManager,
    runManifest: RunScriptManifest,
    signal: AbortSignal,
  ): Promise<RunScriptResult> {
    if (signal.aborted) {
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

    if (signal.aborted) {
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
    {bail = false}: PkgManagerControllerRunScriptsOpts = {},
  ): Promise<RunScriptResult[]> {
    const ac = new AbortController();

    let current = 1;
    let failed = false;

    const {pkgManagers} = this;
    await this.#emitter.runScriptsBegin({
      pkgManagers,
      scripts,
    });

    const results: RunScriptResult[] = [];

    const total =
      pkgManagers.length *
      sumBy(pkgManagers, (pm) => pm.installManifests.length) *
      scripts.length;

    try {
      PKG_MANAGERS: for (const pkgManager of pkgManagers) {
        const runScriptManifests = pkgManager.buildRunScriptManifests(scripts);
        for (const runScriptManifest of runScriptManifests) {
          const eventData = {...runScriptManifest, total, current: current++};
          const {script, pkgName} = runScriptManifest;

          if (ac.signal.aborted) {
            break PKG_MANAGERS;
          }
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
              break PKG_MANAGERS;
            }
            if (bail) {
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
            failed = true;
            if (bail) {
              ac.abort();
            }
          } else if (result.skipped) {
            await this.eventBus.emit(SmokerEvent.RunScriptSkipped, {
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

      if (bail && ac.signal.aborted) {
        failed = true;
      }

      if (failed) {
        await this.#emitter.runScriptsFailed({pkgManagers, results, scripts});
      } else {
        await this.#emitter.runScriptsOk({pkgManagers, results, scripts});
      }
    } finally {
      ac.abort();
    }
    return results;
  }

  private executorForSpec(spec: PkgManagerSpec) {
    return spec.isSystem ? this.defaultExecutor : this.systemExecutor;
  }
}

const debug = Debug('midnight-smoker:pkg-manager:controller');
