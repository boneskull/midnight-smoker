/**
 * Events related to running custom scripts.
 *
 * @packageDocumentation
 * @public
 */

import type * as Schema from '#schema/meta/for-script-events';
import {type Merge, type Simplify} from 'type-fest';
import {type ScriptEvents} from '../constants/event';
import {type PkgManagerEventBase} from './common';

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
   * Emitted once after all custom scripts have run and all were successful.
   *
   * @event
   */
  [ScriptEvents.RunScriptsOk]: RunScriptsOkEventData;

  /**
   * Emitted just before a custom script is about to be run in a package's temp
   * directory (post-{@link InstallOk})
   *
   * @event
   */
  [ScriptEvents.RunScriptBegin]: RunScriptBeginEventData;

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
   * Emitted if a script is skipped for a workspace (because it does not exist)
   *
   * @event
   */
  [ScriptEvents.RunScriptSkipped]: RunScriptSkippedEventData;

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
   * Emitted once after running a custom script completes with any status.
   *
   * @event
   */

  [ScriptEvents.RunScriptEnd]: RunScriptEndEventData;
};

export interface RunScriptsEventDataBase {
  totalScripts: number;
  workspaceInfo: Schema.WorkspaceInfo[];
  pkgManagers: Schema.StaticPkgManagerSpec[];
}

export type RunScriptsBeginEventData = RunScriptsEventDataBase;

export type RunScriptsOkEventData = Merge<
  RunScriptsEventDataBase,
  {
    results: Schema.RunScriptResult[];
    failed: number;
    passed: number;
    skipped: number;
  }
>;

export type RunScriptsFailedEventData = RunScriptsOkEventData;

export type RunScriptEventDataBase = {
  manifest: Schema.RunScriptManifest;
  totalScripts: number;
  pkgManager: Schema.StaticPkgManagerSpec;
};

export type RunScriptBeginEventData = RunScriptEventDataBase;

export type RunScriptEndEventData =
  | RunScriptOkEventData
  | RunScriptFailedEventData
  | RunScriptSkippedEventData
  | RunScriptErrorEventData;

export type RunScriptOkEventData = Simplify<
  Merge<RunScriptEventDataBase, Omit<Schema.RunScriptResultOk, 'type'>>
>;

export type RunScriptFailedEventData = Simplify<
  Merge<RunScriptEventDataBase, Omit<Schema.RunScriptResultFailed, 'type'>>
>;

export type RunScriptSkippedEventData = Simplify<
  Merge<RunScriptEventDataBase, Omit<Schema.RunScriptResultSkipped, 'type'>>
>;

export type RunScriptErrorEventData = Simplify<
  Merge<RunScriptEventDataBase, Omit<Schema.RunScriptResultError, 'type'>>
>;

export interface PkgManagerRunScriptsEventDataBase extends PkgManagerEventBase {
  manifests: Schema.RunScriptManifest[];
  totalScripts: number;
}

export type PkgManagerRunScriptsBeginEventData =
  Simplify<PkgManagerRunScriptsEventDataBase>;

export type PkgManagerRunScriptsOkEventData = Simplify<
  Merge<PkgManagerRunScriptsEventDataBase, {results: Schema.RunScriptResult[]}>
>;

export type PkgManagerRunScriptsFailedEventData =
  Simplify<PkgManagerRunScriptsOkEventData>;
