import {
  type RunScriptsBeginEventData,
  type RunScriptsFailedEventData,
  type RunScriptsOkEventData,
  type ScriptBeginEventData,
  type ScriptFailedEventData,
  type ScriptOkEventData,
} from '#schema/script-runner-events.js';

export interface ScriptRunnerEvents {
  /**
   * Emitted just before a custom script is about to be run in a package's temp
   * directory (post-{@link InstallOk})
   *
   * @event
   */
  RunScriptBegin: ScriptBeginEventData;

  /**
   * Emitted whenever a custom script (run as in {@link RunScriptBegin}) exits
   * with a non-zero exit code.
   *
   * This is _not_ an unrecoverable error.
   *
   * @event
   */
  RunScriptFailed: ScriptFailedEventData;

  /**
   * Emitted whenever a custom script runs successfully for a package.
   *
   * @event
   */
  RunScriptOk: ScriptOkEventData;

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
