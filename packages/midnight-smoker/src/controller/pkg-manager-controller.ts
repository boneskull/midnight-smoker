/**
 * Provides {@link PkgManagerController}, which is sort of a controller for
 * {@link PkgManager}s.
 *
 * @packageDocumentation
 */
import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {
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
  type SomePkgManager,
} from '#pkg-manager';
import {createTempDir, type PluginMetadata, type PluginRegistry} from '#plugin';
import {
  type Executor,
  type PackOptions,
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerOpts,
  type RunScriptManifest,
  type RunScriptResult,
} from '#schema';
import {once} from '#util';
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

  public constructor(
    protected readonly pluginRegistry: PluginRegistry,
    protected readonly eventBus: SmokerEventBus,
    protected readonly desiredPkgManagers: string[],
    opts: PkgManagerControllerOpts & PkgManagerOpts = {},
  ) {
    const {
      defaultExecutorId = DEFAULT_EXECUTOR_ID,
      systemExecutorId = SYSTEM_EXECUTOR_ID,
      cwd = process.cwd(),
      ...pkgManagerOpts
    } = opts;
    this.defaultExecutor = this.pluginRegistry.getExecutor(defaultExecutorId);
    this.systemExecutor = this.pluginRegistry.getExecutor(systemExecutorId);
    this.cwd = cwd;
    this.pkgManagerOpts = pkgManagerOpts;
  }
  public get pkgManagers() {
    if (!this.#pkgManagers.length) {
      debug('Warning: pkgManagers accessed before initialization!');
    }
    return this.#pkgManagers;
  }

  public async createPkgManagerContext(
    spec: PkgManagerSpec,
    opts: PkgManagerOpts = {},
  ): Promise<PkgManagerContext> {
    return {
      spec,
      tmpdir: await createTempDir(),
      executor: this.executorForSpec(spec),
      ...opts,
    };
  }

  public async destroy() {
    await Promise.all(
      this.#pkgManagers.map((pkgManager) => pkgManager.teardown()),
    );
  }

  @once
  public async init() {
    const pkgManagers: SomePkgManager[] = [];
    for await (const pkgManager of this.initPkgManagers(
      this.pluginRegistry.plugins,
    )) {
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

  public async runScript(
    pkgManager: PkgManager,
    runManifest: RunScriptManifest,
    signal: AbortSignal,
  ) {
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
          } else {
            await this.eventBus.emit(SmokerEvent.RunScriptOk, {
              ...eventData,
              rawResult: result.rawResult,
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

  private async *initPkgManagers(plugins: Readonly<PluginMetadata>[]) {
    const {cwd, desiredPkgManagers, pkgManagerOpts} = this;
    for (const plugin of plugins) {
      const pkgManagerDefSpecs = await plugin.loadPkgManagers({
        cwd,
        desiredPkgManagers,
      });
      for (const {spec, def} of pkgManagerDefSpecs) {
        const ctx = await this.createPkgManagerContext(spec, pkgManagerOpts);
        yield PkgManager.create(def, ctx, plugin);
      }
    }
  }
}

const debug = Debug('midnight-smoker:pkg-manager:controller');
