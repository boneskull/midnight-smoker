import {type SmokeError} from '#error/smoke-error';
import {type LintResult, type LintResultFailed} from '#schema/lint-result';
import {
  type RunScriptResult,
  type RunScriptResultFailed,
} from '#schema/run-script-result';
import type {SmokerOptions} from '#schema/smoker-options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type Result} from '#util/result';
import {type Merge} from 'type-fest';
import type {Events} from '../constants/event';

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
  plugins: StaticPluginMetadata[];
  opts: SmokerOptions;
  workspaceInfo: Result<WorkspaceInfo>[];
  pkgManagers: StaticPkgManagerSpec[];
}

export type SmokeEndEventBase = Merge<
  SmokeEventBase,
  {
    scripts?: RunScriptResult[];
    lint?: LintResult[];
  }
>;

export type SmokeOkEventData = SmokeEndEventBase;

export type SmokeFailedEventData = Merge<
  SmokeEndEventBase,
  {
    lintFailed: LintResultFailed[];

    scriptFailed: RunScriptResultFailed[];
  }
>;

export type SmokeErrorEventData = Merge<
  SmokeEndEventBase,
  {
    error: SmokeError;
  }
>;

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

export interface AbortedEventData {
  reason?: unknown;
}

export interface SmokerEventData {
  [Events.Aborted]: AbortedEventData;
  [Events.BeforeExit]: BeforeExitEventData;
  [Events.Lingered]: LingeredEventData;
  [Events.SmokeBegin]: SmokeEventBase;
  [Events.SmokeFailed]: SmokeFailedEventData;
  [Events.SmokeOk]: SmokeOkEventData;
  [Events.SmokeError]: SmokeErrorEventData;
  [Events.UnknownError]: UnknownErrorEventData;
  [Events.Noop]: NoopEventData;
}
