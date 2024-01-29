import {type PkgManagerOpts} from '../component';
import {
  type InstallResult,
  type PackOptions,
  type PkgManager,
  type PkgManagerInstallManifest,
  type RunScriptResult,
} from '../component/schema';
import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '../constants';
import {
  type InstallEvents,
  type PackEvents,
  type ScriptRunnerEvents,
} from '../event';
import {createStrictEmitter} from '../event/strict-emitter';
import {type PluginRegistry} from '../plugin/registry';

export abstract class PkgManagerController extends createStrictEmitter<PkgManagerEvents>() {
  protected readonly defaultExecutorId: string;

  protected readonly systemExecutorId: string;

  public constructor(
    protected readonly pluginRegistry: PluginRegistry,
    protected readonly desiredPkgManagers: string | readonly string[],
    protected readonly opts: PkgManagerControllerOpts = {},
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

export interface PkgManagerControllerOpts extends PkgManagerOpts {
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
