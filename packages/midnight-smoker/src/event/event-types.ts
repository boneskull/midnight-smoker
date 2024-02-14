import type {ScriptRunnerEvents} from '#event/script-runner-events';
import type {RunRulesResult} from '#schema/rule-runner-result';
import type {RunScriptResult} from '#schema/run-script-result';
import type {SmokeFailedError} from '../error/smoker-error';
import type {SmokerOptions} from '../options/options';
import type {StaticPluginMetadata} from '../plugin/static-metadata';
import type {InstallEvents} from './install-events';
import type {PackEvents} from './pack-events';
import type {RuleRunnerEvents} from './rule-runner-events';

/**
 * Describes the data emitted by each event.
 */
export interface SmokerEvents
  extends ScriptRunnerEvents,
    InstallEvents,
    PackEvents,
    RuleRunnerEvents {
  /**
   * Emitted after all other events have been emitted, and just before exit.
   *
   * This implies that {@link SmokerEvents.UnknownError} will _not_ be emitted if
   * it has not been emitted already.
   *
   * @event
   */
  End: void;

  /**
   * Emitted only if the `--linger` option was provided; a list of temp
   * directories used by `midnight-smoker` and left on disk at user behest.
   *
   * @event
   */
  Lingered: string[];

  /**
   * Emitted just before the initial "pack" phase begins.
   *
   * @event
   */
  SmokeBegin: SmokeBeginEventData;

  /**
   * Emitted at the end of execution if any script or automated check failed.
   *
   * @event
   */
  SmokeFailed: SmokeFailedError<SmokeResults>;

  /**
   * Emitted at the end of execution if no script or automated check failed.
   *
   * @event
   */
  SmokeOk: SmokeResults;

  /**
   * Emitted if `smoker.smoke()` rejects, which should not happen under normal
   * operation.
   *
   * I think.
   *
   * @event
   */
  UnknownError: Error;
}

/**
 * The result of running `Smoker.smoke()`
 */
export interface SmokeResults {
  checks?: RunRulesResult;
  opts: SmokerOptions;
  scripts?: RunScriptResult[];
}

/**
 * The data emitted by the `SmokeBegin` event.
 *
 * @todo Maybe add more stuff
 */
export interface SmokeBeginEventData {
  plugins: StaticPluginMetadata[];
  opts: SmokerOptions;
}
