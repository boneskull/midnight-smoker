import {type SmokeFailedError} from '#error/smoker-error';
import type {SmokerOptions} from '#options/options';
import {type LintResult} from '#schema/lint-result';
import {type RunScriptResult} from '#schema/run-script-result';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import type {SmokerEvent} from './event-constants';

/**
 * Emitted after all other events have been emitted, and just before exit.
 *
 * This implies that {@link SmokerEvents.UnknownError} will _not_ be emitted if
 * it has not been emitted already.
 *
 * @event
 */

export interface BeforeExitEventData {}

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
}

/**
 * Emitted at the end of execution if no script or automated check failed.
 *
 * @event
 */

export interface SmokeOkEventData extends SmokeBeginEventData {
  scripts?: RunScriptResult[];
  lint?: LintResult[];
}

/**
 * Emitted at the end of execution if any script or automated check failed.
 *
 * @event
 */
export interface SmokeFailedEventData extends SmokeBeginEventData {
  error: SmokeFailedError<{scripts?: RunScriptResult[]; lint?: LintResult}>;
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
export type SmokeResults = SmokeOkEventData;

export interface SmokerEventData {
  [SmokerEvent.BeforeExit]: BeforeExitEventData;
  [SmokerEvent.Lingered]: LingeredEventData;
  [SmokerEvent.SmokeBegin]: SmokeBeginEventData;
  [SmokerEvent.SmokeFailed]: SmokeFailedEventData;
  [SmokerEvent.SmokeOk]: SmokeOkEventData;
  [SmokerEvent.UnknownError]: UnknownErrorEventData;
}
