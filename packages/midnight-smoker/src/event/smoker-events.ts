import {type SmokeError} from '#error/smoke-error';
import type {SmokerOptions} from '#options/options';
import {type LintResult, type LintResultFailed} from '#schema/lint-result';
import {
  type RunScriptResult,
  type RunScriptResultFailed,
} from '#schema/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {type Result, type WorkspaceInfo} from '#schema/workspaces';
import type {SmokerEvent} from './event-constants';

/**
 * Emitted after all other events have been emitted, and just before exit.
 *
 * @event
 */

export type BeforeExitEventData = void;

/**
 * Emitted only if the `--linger` option was provided; a list of temp
 * directories used by `midnight-smoker` and left on disk at user behest.
 *
 * @event
 */

export interface LingeredEventData {
  directories: string[];
}

/**
 * Emitted just before the initial "pack" phase begins.
 *
 * @event
 */

export interface SmokeBeginEventData {
  plugins: StaticPluginMetadata[];
  opts: SmokerOptions;
  workspaceInfo: Result<WorkspaceInfo>[];
  pkgManagers: StaticPkgManagerSpec[];
}

interface SmokeEndEventData extends SmokeBeginEventData {
  scripts?: RunScriptResult[];
  lint?: LintResult[];
}

/**
 * Emitted at the end of execution if no script or automated check failed.
 *
 * @event
 */

export interface SmokeOkEventData extends SmokeEndEventData {}

/**
 * Emitted at the end of execution if any script or automated check failed.
 *
 * @event
 */
export interface SmokeFailedEventData extends SmokeEndEventData {
  lintFailed: LintResultFailed[];

  scriptFailed: RunScriptResultFailed[];
}

export interface SmokeErrorEventData extends SmokeEndEventData {
  error: SmokeError;
}

/**
 * Emitted if `smoker.smoke()` rejects, which should not happen under normal
 * operation.
 *
 * I think.
 *
 * @event
 */
export interface UnknownErrorEventData {
  error: Error;
}

/**
 * The final result type of a `midnight-smoker` run
 */
export type SmokeResults = Omit<
  SmokeOkEventData,
  'pkgManagers' | 'workspaceInfo'
>;

export interface SmokerEventData {
  [SmokerEvent.BeforeExit]: BeforeExitEventData;
  [SmokerEvent.Lingered]: LingeredEventData;
  [SmokerEvent.SmokeBegin]: SmokeBeginEventData;
  [SmokerEvent.SmokeFailed]: SmokeFailedEventData;
  [SmokerEvent.SmokeOk]: SmokeOkEventData;
  [SmokerEvent.SmokeError]: SmokeErrorEventData;
  [SmokerEvent.UnknownError]: UnknownErrorEventData;
}
