import {type ERROR, type FAILED, type OK} from '#constants';
import {CoreEvents} from '#constants/event';
import {type StaticPluginMetadata} from '#defs/plugin';
import {type SmokeError} from '#error/smoke-error';
import {type LintResult, type LintResultFailed} from '#rule/lint-result';
import {
  type RunScriptResult,
  type RunScriptResultError,
  type RunScriptResultFailed,
} from '#schema/run-script-result';
import {type SmokerOptions} from '#schema/smoker-options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type Result} from '#util/result';

export {CoreEvents};

/**
 * Emitted after all other events have been emitted, and just before exit.
 *
 * @event
 */

export type BeforeExitEventData = void;

/**
 * Does nothing and not emitted anyway!
 *
 * @event
 */
export type NoopEventData = void;

/**
 * Emitted only if the `--linger` option was provided; a list of temp
 * directories used by `midnight-smoker` and left on disk at user behest.
 *
 * @event
 */

export interface LingeredEventData {
  directories: string[];
}

export interface SmokeEventBase {
  pkgManagers: StaticPkgManagerSpec[];
  plugins: StaticPluginMetadata[];
  smokerOptions: SmokerOptions;
  workspaceInfo: Result<WorkspaceInfo>[];
}

export type SmokeEndEventBase = {
  lint?: LintResult[];
  scripts?: RunScriptResult[];
  success: boolean;
} & SmokeEventBase;

export type SmokeOkEventData = {
  resultType: typeof OK;
} & SmokeEndEventBase;

export type SmokeFailedEventData = {
  lintFailed: LintResultFailed[];
  resultType: typeof FAILED;
  scriptsFailed: (RunScriptResultError | RunScriptResultFailed)[];
} & SmokeEndEventBase;

export type SmokeEndEventData = SmokeEndEventBase;

export type SmokeErrorEventData = {
  error: SmokeError;
  resultType: typeof ERROR;
} & SmokeEndEventBase;

/**
 * The final result type of a `midnight-smoker` run
 */
export type SmokeResults =
  | SmokeResultsError
  | SmokeResultsFailed
  | SmokeResultsOk;

/**
 * {@inheritDoc SmokeOkEventData}
 */
export type SmokeResultsOk = {
  type: typeof OK;
} & Omit<SmokeOkEventData, 'resultType'>;

/**
 * {@inheritDoc SmokeFailedEventData}
 */
export type SmokeResultsFailed = {
  type: typeof FAILED;
} & Omit<SmokeFailedEventData, 'resultType'>;

export type SmokeResultsError = {
  type: typeof ERROR;
} & Omit<SmokeErrorEventData, 'resultType'>;

/**
 * Emitted when an operation is aborted.
 *
 * @event
 */
export interface AbortedEventData {
  reason?: unknown;
}

/**
 * Emitted when the package manager is guessed.
 *
 * This should probably be a warning of some sort.
 *
 * @event
 */
export type GuessedPkgManagerEventData = {
  pkgManager: StaticPkgManagerSpec;
  reason: string;
};

export type CoreEventData = {
  [CoreEvents.Aborted]: AbortedEventData;
  [CoreEvents.BeforeExit]: BeforeExitEventData;
  [CoreEvents.GuessedPkgManager]: GuessedPkgManagerEventData;
  [CoreEvents.Lingered]: LingeredEventData;
  [CoreEvents.Noop]: NoopEventData;
  [CoreEvents.SmokeBegin]: SmokeEventBase;
  [CoreEvents.SmokeEnd]: SmokeEndEventData;
  [CoreEvents.SmokeError]: SmokeErrorEventData;
  [CoreEvents.SmokeFailed]: SmokeFailedEventData;
  [CoreEvents.SmokeOk]: SmokeOkEventData;
};
