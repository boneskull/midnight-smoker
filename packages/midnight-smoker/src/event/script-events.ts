import {type RunScriptManifest} from '#schema/run-script-manifest';
import {
  type RunScriptErrorResult,
  type RunScriptFailedResult,
  type RunScriptOkResult,
  type RunScriptResult,
  type RunScriptSkippedResult,
} from '#schema/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type ScriptEvent} from './event-constants';
import {type PkgManagerEventBase} from './pkg-manager-events';

export interface ScriptEventData {
  [ScriptEvent.PkgManagerRunScriptsBegin]: PkgManagerRunScriptsBeginEventData;
  [ScriptEvent.PkgManagerRunScriptsFailed]: PkgManagerRunScriptsFailedEventData;
  [ScriptEvent.PkgManagerRunScriptsOk]: PkgManagerRunScriptsOkEventData;

  /**
   * Emitted once after the "checks" phase is complete (if enabled) and just
   * before custom scripts are about to run.
   *
   * @event
   */
  [ScriptEvent.RunScriptsBegin]: RunScriptsBeginEventData;

  /**
   * Emitted once after all custom scripts have run and at least one has failed.
   *
   * @event
   */
  [ScriptEvent.RunScriptsFailed]: RunScriptsFailedEventData;

  /**
   * Emitted once after all custom scripts have run and all were successful.
   *
   * @event
   */
  [ScriptEvent.RunScriptsOk]: RunScriptsOkEventData;

  /**
   * Emitted just before a custom script is about to be run in a package's temp
   * directory (post-{@link InstallOk})
   *
   * @event
   */
  [ScriptEvent.RunScriptBegin]: RunScriptBeginEventData;

  /**
   * Emitted whenever a custom script (run as in {@link RunScriptBegin}) exits
   * with a non-zero exit code.
   *
   * This is _not_ an unrecoverable error.
   *
   * @event
   */
  [ScriptEvent.RunScriptFailed]: RunScriptFailedEventData;

  /**
   * Emitted whenever a custom script runs successfully for a package.
   *
   * @event
   */
  [ScriptEvent.RunScriptOk]: RunScriptOkEventData;

  /**
   * Emitted if a script is skipped for a workspace (because it does not exist)
   *
   * @event
   */
  [ScriptEvent.RunScriptSkipped]: RunScriptSkippedEventData;

  [ScriptEvent.RunScriptError]: RunScriptErrorEventData;
}

export interface RunScriptsEventDataBase {
  totalUniqueScripts: number;
  totalUniquePkgs: number;
  totalPkgManagers: number;
}

export interface RunScriptsBeginEventData extends RunScriptsEventDataBase {}

export interface RunScriptsOkEventData extends RunScriptsEventDataBase {
  results: RunScriptResult[];
  failed: number;
  passed: number;
  skipped: number;
}

export interface RunScriptsFailedEventData extends RunScriptsOkEventData {}

export interface RunScriptEventDataBase {
  manifest: RunScriptManifest;
  totalUniqueScripts: number;
  pkgManager: StaticPkgManagerSpec;
}

export interface RunScriptBeginEventData extends RunScriptEventDataBase {}

export interface RunScriptOkEventData
  extends RunScriptEventDataBase,
    Omit<RunScriptOkResult, 'type'> {}

export interface RunScriptFailedEventData
  extends RunScriptEventDataBase,
    Omit<RunScriptFailedResult, 'type'> {}

export interface RunScriptSkippedEventData
  extends RunScriptEventDataBase,
    Omit<RunScriptSkippedResult, 'type'> {}

export interface RunScriptErrorEventData
  extends RunScriptEventDataBase,
    Omit<RunScriptErrorResult, 'type'> {}

export interface PkgManagerRunScriptsEventDataBase extends PkgManagerEventBase {
  manifests: RunScriptManifest[];
  totalUniqueScripts: number;
  totalUniquePkgs: number;
}

export interface PkgManagerRunScriptsBeginEventData
  extends PkgManagerRunScriptsEventDataBase {}

export interface PkgManagerRunScriptsOkEventData
  extends PkgManagerRunScriptsEventDataBase {
  results: RunScriptResult[];
}

export interface PkgManagerRunScriptsFailedEventData
  extends PkgManagerRunScriptsOkEventData {}
