import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {type InstallEvents} from '#event/install-events.js';
import {type PackEvents} from '#event/pack-events.js';
import {type ScriptRunnerEvents} from '#event/script-runner-events.js';
import {createStrictEmitter} from '#event/strict-emitter.js';
import {type PluginRegistry} from '#plugin/registry.js';
import {type PkgManagerInstallManifest} from '#schema/install-manifest.js';
import {type InstallResult} from '#schema/install-result.js';
import {type PackOptions} from '#schema/pack-options.js';
import {type PkgManagerOpts} from '#schema/pkg-manager-def.js';
import {type PkgManager} from '#schema/pkg-manager.js';
import {type RunScriptResult} from '#schema/run-script-result.js';

export abstract class PkgManagerController extends createStrictEmitter<PkgManagerEvents>() {
  protected readonly defaultExecutorId: string;

  protected readonly systemExecutorId: string;

  public constructor(
    protected readonly pluginRegistry: PluginRegistry,
    protected readonly desiredPkgManagers: string | readonly string[],
    protected readonly opts: PkgManagerControllerOpts & PkgManagerOpts = {},
  ) {
    super();

    this.defaultExecutorId = opts.defaultExecutorId ?? DEFAULT_EXECUTOR_ID;
    this.systemExecutorId = opts.systemExecutorId ?? SYSTEM_EXECUTOR_ID;
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
    opts: PkgManagerControllerRunScriptsOpts,
  ): Promise<RunScriptResult[]>;
}

/**
 * All events emitted by the {@link SmokerPkgManagerController} class.
 */

export type PkgManagerEvents = InstallEvents & ScriptRunnerEvents & PackEvents;

/**
 * Options for the {@link SmokerPkgManagerController} class.
 */

export interface PkgManagerControllerOpts {
  defaultExecutorId?: string;

  systemExecutorId?: string;
}

/**
 * Options for {@link SmokerPkgManagerController.runScripts}
 */

export interface PkgManagerControllerRunScriptsOpts {
  /**
   * If `true`, halt execution of scripts on the first failure.
   */
  bail?: boolean;

  /**
   * The ID of the script runner to use.
   */
  scriptRunnerId?: string;
}
