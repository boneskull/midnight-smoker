import type {z} from 'zod';
import type {
  zRunScriptBeginNotifierParams,
  zRunScriptFailedEventData,
  zRunScriptsEndEventData,
  zRunScriptsEventData,
} from '../component/schema/script-runner-schema';

export interface ScriptRunnerEvents {
  /**
   * Emitted just before a custom script is about to be run in a package's temp
   * directory (post-{@link InstallOk})
   *
   * @event
   */
  RunScriptBegin: RunScriptEventData;

  /**
   * Emitted whenever a custom script (run as in {@link RunScriptBegin}) exits
   * with a non-zero exit code.
   *
   * This is _not_ an unrecoverable error.
   *
   * @event
   */
  RunScriptFailed: RunScriptFailedEventData;

  /**
   * Emitted whenever a custom script runs successfully for a package.
   *
   * @event
   */
  RunScriptOk: RunScriptEventData;

  /**
   * Emitted once after the "checks" phase is complete (if enabled) and just
   * before custom scripts are about to run.
   *
   * @event
   */
  RunScriptsBegin: RunScriptsBeginEventData;

  /**
   * Emitted once after all custom scripts have run and at least one has failed.
   *
   * @event
   */
  RunScriptsFailed: RunScriptsFailedEventData;

  /**
   * Emitted once after all custom scripts have run and all were successful.
   *
   * @event
   */
  RunScriptsOk: RunScriptsOkEventData;
}
export type RunScriptFailedEventData = z.infer<
  typeof zRunScriptFailedEventData
>;
export type RunScriptEventData = z.infer<typeof zRunScriptBeginNotifierParams>;
export type RunScriptsEndEventData = z.infer<typeof zRunScriptsEndEventData>;

export type RunScriptsBeginEventData = RunScriptsEventData;
export type RunScriptsEventData = z.infer<typeof zRunScriptsEventData>;

export type RunScriptsOkEventData = RunScriptsEndEventData;

export type RunScriptsFailedEventData = RunScriptsEndEventData;
