import {type RunScriptManifest} from '#schema/run-script-manifest';
import {
  type RunScriptResult,
  type RunScriptResultError,
  type RunScriptResultFailed,
  type RunScriptResultOk,
  type RunScriptResultSkipped,
} from '#schema/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {type Simplify} from 'type-fest';
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

  [ScriptEvent.RunScriptEnd]: RunScriptEndEventData;
}

export interface RunScriptsEventDataBase {
  totalScripts: number;
  workspaceInfo: WorkspaceInfo[];
  pkgManagers: StaticPkgManagerSpec[];
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
  totalScripts: number;
  pkgManager: StaticPkgManagerSpec;
}

export interface RunScriptBeginEventData extends RunScriptEventDataBase {}

export type RunScriptEndEventData =
  | RunScriptOkEventData
  | RunScriptFailedEventData
  | RunScriptSkippedEventData
  | RunScriptErrorEventData;

export type RunScriptOkEventData = Simplify<
  RunScriptEventDataBase & Omit<RunScriptResultOk, 'type'>
>;

export type RunScriptFailedEventData = Simplify<
  RunScriptEventDataBase & Omit<RunScriptResultFailed, 'type'>
>;

export type RunScriptSkippedEventData = Simplify<
  RunScriptEventDataBase & Omit<RunScriptResultSkipped, 'type'>
>;

export type RunScriptErrorEventData = Simplify<
  RunScriptEventDataBase & Omit<RunScriptResultError, 'type'>
>;

export interface PkgManagerRunScriptsEventDataBase extends PkgManagerEventBase {
  manifests: RunScriptManifest[];
  totalScripts: number;
}

export interface PkgManagerRunScriptsBeginEventData
  extends PkgManagerRunScriptsEventDataBase {}

export interface PkgManagerRunScriptsOkEventData
  extends PkgManagerRunScriptsEventDataBase {
  results: RunScriptResult[];
}

export interface PkgManagerRunScriptsFailedEventData
  extends PkgManagerRunScriptsOkEventData {}
