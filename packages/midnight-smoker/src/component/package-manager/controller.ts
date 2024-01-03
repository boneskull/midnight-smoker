/**
 * Provides {@link SmokerPkgManagerController}, which is sort of a controller for
 * {@link PkgManager}s.
 *
 * @internal
 * @packageDocumentation
 */

import Debug from 'debug';
import {DEFAULT_COMPONENT_ID} from '../../constants';
import {InstallError} from '../../error/install-error';
import {PackError} from '../../error/pack-error';
import {RunScriptBailed} from '../../error/script-error';
import {SmokerEvent} from '../../event/event-constants';
import {
  buildInstallEventData,
  buildPackBeginEventData,
  buildPackOkEventData,
  buildRunScriptsBeginEventData,
  buildRunScriptsEndEventData,
} from '../../event/event-util';
import type {InstallEvents} from '../../event/install-events';
import type {PackEvents} from '../../event/pack-events';
import type {ScriptRunnerEvents} from '../../event/script-runner-events';
import {createStrictEmitter} from '../../event/strict-emitter';
import type {PluginRegistry} from '../../plugin/registry';
import type {
  InstallManifest,
  InstallResult,
  PackOptions,
  PkgManager,
  PkgManagerInstallManifest,
  PkgManagerRunScriptManifest,
  RunScriptResult,
} from '../schema';
import {createScriptRunnerNotifiers} from '../script-runner/script-runner-notifier';
import type {PkgManagerOpts} from './pkg-manager-types';

const debug = Debug('midnight-smoker:pkg-manager:controller');

/**
 * All events emitted by the {@link SmokerPkgManagerController} class.
 */
export type PkgManagerEvents = InstallEvents & ScriptRunnerEvents & PackEvents;

/**
 * Options for the {@link SmokerPkgManagerController} class.
 */
export interface PkgManagerControllerOpts extends PkgManagerOpts {
  executorId?: string;
}

/**
 * @internal
 */
export abstract class PkgManagerController extends createStrictEmitter<PkgManagerEvents>() {
  protected readonly executorId: string;

  public constructor(
    protected readonly pluginRegistry: PluginRegistry,
    protected readonly pkgManagerSpecs: readonly string[],
    protected readonly opts: PkgManagerControllerOpts = {},
  ) {
    super();

    this.executorId = opts.executorId ?? DEFAULT_COMPONENT_ID;
  }

  public abstract getPkgManagers(): Promise<readonly PkgManager[]>;

  public abstract install(
    installManifests: PkgManagerInstallManifest[],
    additionalDeps?: string[],
  ): Promise<InstallResult[]>;

  public abstract pack(
    opts?: PackOptions,
  ): Promise<PkgManagerInstallManifest[]>;

  public abstract runScripts(
    scripts: string[],
    installResults: InstallResult[],
    opts: RunScriptsOpts,
  ): Promise<RunScriptResult[]>;
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
export class SmokerPkgManagerController extends PkgManagerController {
  private pkgManagers?: readonly PkgManager[];

  /**
   * Retrieves the package managers. If the package managers have already been
   * loaded, returns the cached result. Otherwise, loads the package managers
   * from the plugin registry.
   *
   * @returns An array of package managers.
   */
  public async getPkgManagers(): Promise<readonly PkgManager[]> {
    if (this.pkgManagers) {
      return this.pkgManagers;
    }
    const pkgManagerMap = await this.pluginRegistry.loadPackageManagers(
      this.executorId,
      this.pkgManagerSpecs,
      {
        verbose: this.opts.verbose,
        loose: this.opts.loose,
      },
    );

    this.pkgManagers = Object.freeze([...pkgManagerMap.values()]);
    debug(
      'Loaded package manager(s): %s for specs %s',
      [...pkgManagerMap.keys()].sort().join(', '),
      [...this.pkgManagerSpecs].sort().join(', '),
    );

    return this.pkgManagers;
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
  public async install(
    installManifests: PkgManagerInstallManifest[],
    additionalDeps: string[] = [],
  ): Promise<InstallResult[]> {
    // we could either do this or extract the `pkgManager` prop from each
    // `installManifest`, make unique, and use that.
    const pkgManagers = await this.getPkgManagers();

    // each PM will need to install additional deps.
    const additionalDepInstallManifests = pkgManagers.flatMap((pkgManager) =>
      additionalDeps.map((spec) => ({
        cwd: pkgManager.tmpdir,
        spec,
        pkgManager,
        isAdditional: true,
        pkgName: spec,
      })),
    );

    installManifests = [...installManifests, ...additionalDepInstallManifests];

    const eventData = buildInstallEventData(installManifests, pkgManagers);

    // this increments by the number of install manifests for each PM
    let current = 0;

    this.emit(SmokerEvent.InstallBegin, eventData);

    // TODO: this suggests to me that `InstallResult` is not the most efficient data structure for our purposes.
    const manifestsByPkgManager = installManifests.reduce<
      Map<PkgManager, PkgManagerInstallManifest[]>
    >((acc, installManifest) => {
      const {pkgManager} = installManifest;
      const manifests = acc.get(pkgManager) ?? [];
      acc.set(pkgManager, [...manifests, installManifest]);
      return acc;
    }, new Map());

    // TODO: this should be using an AbortController to halt the install if one fails
    // TODO: should this be done in serial?
    return Promise.all(
      [...manifestsByPkgManager].map<Promise<InstallResult>>(
        async ([pkgManager, installManifests]) => {
          try {
            // PMs receive multiple install manifests at once, since they can install multiple packages at once.
            const rawResult = await pkgManager.install(installManifests);
            this.emit(SmokerEvent.InstallOk, {
              ...eventData,
              current: (current += installManifests.length),
            });
            return {rawResult, installManifests};
          } catch (err) {
            if (err instanceof InstallError) {
              this.emit(SmokerEvent.InstallFailed, err);
            }
            throw err;
          }
        },
      ),
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
  public async pack(
    opts: PackOptions = {},
  ): Promise<PkgManagerInstallManifest[]> {
    const pkgManagers = await this.getPkgManagers();

    this.emit(SmokerEvent.PackBegin, buildPackBeginEventData(pkgManagers));

    /**
     * A {@link PkgManager} returns simplified information about a `pack()`
     * operation, but we must associate each {@link InstallManifest} with a
     * `PackageManager` instance, so we can ensure the same instance which
     * packed the tarball then {@link install installs} it.
     *
     * These will _all_ have `isAdditional: false` because we do not pack
     * "additional dependencies".
     *
     * @param pkgManager Package Manager instance
     * @param manifest Result of calling its `pack()` method
     * @returns A {@link PkgManagerInstallManifest}
     */
    const toControllerInstallManifest = (
      pkgManager: PkgManager,
      manifest: InstallManifest,
    ): PkgManagerInstallManifest => ({
      ...manifest,
      pkgManager,
      isAdditional: false,
    });

    const installManifests = await Promise.all(
      pkgManagers.map(async (pkgManager) => {
        try {
          const manifests = await pkgManager.pack(opts);
          return manifests.map((manifest) =>
            toControllerInstallManifest(pkgManager, manifest),
          );
        } catch (err) {
          if (err instanceof PackError) {
            this.emit(SmokerEvent.PackFailed, err);
          }
          throw err;
        }
      }),
    ).then((result) => result.flat());

    this.emit(
      SmokerEvent.PackOk,
      buildPackOkEventData(installManifests, pkgManagers),
    );

    return installManifests;
  }

  /**
   * Runs the specified scripts for each package & package manager in the
   * provided {@link InstallResult} array.
   *
   * Handles emitting all events in {@link ScriptRunnerEvents}.
   *
   * @param scripts - An array of scripts to run.
   * @param installResults - An array of install results.
   * @param opts - Options controlling run behavior.
   * @returns A promise that resolves to an array of run script results.
   */
  public async runScripts(
    scripts: string[],
    installResults: InstallResult[],
    opts: RunScriptsOpts,
  ): Promise<RunScriptResult[]> {
    const ac = new AbortController();
    const scriptRunner = this.pluginRegistry.getScriptRunner();

    const runManifests: PkgManagerRunScriptManifest[] = installResults.flatMap(
      ({installManifests}) =>
        scripts.flatMap((script) =>
          installManifests
            .filter((installManifest) => installManifest.installPath)
            .map((installManifest) => ({
              ...installManifest,
              script,
              cwd: installManifest.installPath!,
            })),
        ),
    );

    const beginEvtData = buildRunScriptsBeginEventData(runManifests);
    const notifiers = createScriptRunnerNotifiers(this, beginEvtData.total);

    const runScriptFailedListener = () => {
      if (opts.bail) {
        ac.abort();
      }
    };
    this.once(SmokerEvent.RunScriptFailed, runScriptFailedListener);

    await Promise.resolve();
    this.emit(SmokerEvent.RunScriptsBegin, beginEvtData);
    const results: RunScriptResult[] = [];

    try {
      for (const runManifest of runManifests) {
        try {
          results.push(
            await scriptRunner(notifiers, runManifest, {signal: ac.signal}),
          );
        } catch (err) {
          if (err instanceof RunScriptBailed) {
            break;
          }
          if (opts.bail) {
            ac.abort();
          }
          throw err;
        }
      }

      const endEvtData = buildRunScriptsEndEventData(beginEvtData, results);
      if (endEvtData.failed > 0) {
        this.emit(SmokerEvent.RunScriptsFailed, endEvtData);
      } else {
        this.emit(SmokerEvent.RunScriptsOk, endEvtData);
      }

      ac.abort();
      return results;
    } finally {
      this.off(SmokerEvent.RunScriptFailed, runScriptFailedListener);
    }
  }
}

/**
 * Options for {@link SmokerPkgManagerController.runScripts}
 */
export interface RunScriptsOpts {
  /**
   * If `true`, halt execution of scripts on the first failure.
   */
  bail?: boolean;
}
