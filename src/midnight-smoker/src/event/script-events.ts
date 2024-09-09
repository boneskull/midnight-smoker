/**
 * Events related to running custom scripts.
 *
 * @packageDocumentation
 * @public
 */

import type * as Schema from '#schema/meta/for-script-events';

import {ScriptEvents} from '#constants/event';

import {type PkgManagerEventBase} from './common.js';

export {ScriptEvents};

export type ScriptEventData = {
  /**
   * Emitted when a package manager begins running custom scripts.
   *
   * @event
   */
  [ScriptEvents.PkgManagerRunScriptsBegin]: PkgManagerRunScriptsBeginEventData;

  /**
   * Emitted when a package manager has run all custom scripts and at least one
   * has failed.
   *
   * @event
   */
  [ScriptEvents.PkgManagerRunScriptsFailed]: PkgManagerRunScriptsFailedEventData;

  /**
   * Emitted when a package manager has run all custom scripts and all were
   * successful.
   */
  [ScriptEvents.PkgManagerRunScriptsOk]: PkgManagerRunScriptsOkEventData;

  /**
   * Emitted just before a custom script is about to be run in a package's temp
   * directory (post-{@link InstallOk})
   *
   * @event
   */
  [ScriptEvents.RunScriptBegin]: RunScriptBeginEventData;

  [ScriptEvents.RunScriptEnd]: RunScriptResultEventData;

  /**
   * Emitted whenever running custom script (run as in {@link RunScriptBegin})
   * throws for reasons unrelated to the script itself
   *
   * This _is_ an unrecoverable error, as it is considered to be unexpected
   * behavior.
   *
   * @event
   */
  [ScriptEvents.RunScriptError]: RunScriptErrorEventData;

  /**
   * Emitted whenever a custom script (run as in {@link RunScriptBegin}) exits
   * with a non-zero exit code.
   *
   * This is _not_ an unrecoverable error.
   *
   * @event
   */
  [ScriptEvents.RunScriptFailed]: RunScriptFailedEventData;

  /**
   * Emitted whenever a custom script runs successfully for a package.
   *
   * @event
   */
  [ScriptEvents.RunScriptOk]: RunScriptOkEventData;

  /**
   * Emitted once after the "checks" phase is complete (if enabled) and just
   * before custom scripts are about to run.
   *
   * @event
   */
  [ScriptEvents.RunScriptsBegin]: RunScriptsBeginEventData;

  /**
   * Emitted once after all custom scripts have run and at least one has failed.
   *
   * @event
   */
  [ScriptEvents.RunScriptsFailed]: RunScriptsFailedEventData;

  /**
   * Emitted if a script is skipped for a workspace (because it does not exist)
   *
   * @event
   */
  [ScriptEvents.RunScriptSkipped]: RunScriptSkippedEventData;

  /**
   * Emitted once after running a custom script completes with any status.
   *
   * @event
   */

  /**
   * Emitted once after all custom scripts have run and all were successful.
   *
   * @event
   */
  [ScriptEvents.RunScriptsOk]: RunScriptsOkEventData;
};

export interface RunScriptsEventDataBase {
  pkgManagers: Schema.StaticPkgManagerSpec[];
  totalScripts: number;
  workspaceInfo: Schema.WorkspaceInfo[];
}

export type RunScriptsBeginEventData = RunScriptsEventDataBase;

export type RunScriptsOkEventData = {
  failed: number;
  passed: number;
  results: Schema.RunScriptResult[];
  skipped: number;
} & RunScriptsEventDataBase;

export type RunScriptsFailedEventData = RunScriptsOkEventData;

export type RunScriptEventDataBase<Result = void> = {
  manifest: Schema.RunScriptManifest;
  pkgManager: Schema.StaticPkgManagerSpec;
  result: Result;
  totalScripts: number;
};

export type RunScriptBeginEventData = Omit<RunScriptEventDataBase, 'result'>;

export type RunScriptResultEventData =
  | RunScriptErrorEventData
  | RunScriptFailedEventData
  | RunScriptOkEventData
  | RunScriptSkippedEventData;

export type RunScriptOkEventData =
  RunScriptEventDataBase<Schema.RunScriptResultOk>;

export type RunScriptFailedEventData =
  RunScriptEventDataBase<Schema.RunScriptResultFailed>;

export type RunScriptSkippedEventData =
  RunScriptEventDataBase<Schema.RunScriptResultSkipped>;

export type RunScriptErrorEventData =
  RunScriptEventDataBase<Schema.RunScriptResultError>;

export type PkgManagerRunScriptsEventDataBase = {
  manifests: Schema.RunScriptManifest[];
  totalScripts: number;
} & PkgManagerEventBase;

export type PkgManagerRunScriptsBeginEventData =
  PkgManagerRunScriptsEventDataBase;

export type PkgManagerRunScriptsOkEventData = {
  results: Schema.RunScriptResult[];
} & PkgManagerRunScriptsEventDataBase;

export type PkgManagerRunScriptsFailedEventData =
  PkgManagerRunScriptsOkEventData;
