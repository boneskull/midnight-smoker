import {RunScriptResult} from '../component/schema/pkg-manager-schema';
import {RunRulesResult} from '../component/schema/rule-runner-schema';
import {SmokeFailedError} from '../error/smoker-error';
import {SmokerOptions} from '../options/options';
import {StaticPluginMetadata} from '../plugin/static-metadata';
import {InstallEvents} from './install-events';
import {PackEvents} from './pack-events';
import {RuleEvents} from './rule-events';
import {ScriptRunnerEvents} from './script-runner-events';

/**
 * Describes the data emitted by each event.
 */
export interface SmokerEvents
  extends ScriptRunnerEvents,
    InstallEvents,
    PackEvents,
    RuleEvents {
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
