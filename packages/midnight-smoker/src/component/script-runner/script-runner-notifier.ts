import {SmokerEvent} from '#event/event-constants.js';
import type {ScriptRunnerEvents} from '#event/script-runner-events.js';
import type {StrictEmitter} from '#event/strict-emitter.js';
import {
  ScriptBeginNotifierSchema,
  ScriptFailedNotifierSchema,
  ScriptOkNotifierSchema,
  type ScriptRunnerNotifiers,
} from '#schema/script-runner-notifier.js';

export type ScriptRunnerEmitter = StrictEmitter<ScriptRunnerEvents>;

/**
 * These notifiers manage the total/current script counts for the `ScriptRunner`
 *
 * @param emitter - The {@link ScriptRunnerEmitter} to use
 * @param total - The total number of scripts to run
 * @returns Notifiers for the script runner
 * @internal
 */
export function createScriptRunnerNotifiers(
  emitter: ScriptRunnerEmitter,
  total: number,
): ScriptRunnerNotifiers {
  let current = 0;
  const indices = new Map<string, number>();
  return {
    scriptBegin: ScriptBeginNotifierSchema.implement((data) => {
      const idx = current++;
      indices.set(`${data.pkgName}:${data.script}`, idx);
      data.total ??= total;
      data.current ??= idx;
      emitter.emit(SmokerEvent.RunScriptBegin, data);
    }),
    scriptOk: ScriptOkNotifierSchema.implement((data) => {
      const idxId = `${data.pkgName}:${data.script}`;
      data.total ??= total;
      data.current = indices.get(idxId)!;
      emitter.emit(SmokerEvent.RunScriptOk, data);
    }),
    scriptFailed: ScriptFailedNotifierSchema.implement((data) => {
      const idxId = `${data.pkgName}:${data.script}`;
      data.total ??= total;
      data.current = indices.get(idxId)!;
      emitter.emit(SmokerEvent.RunScriptFailed, data);
    }),
  };
}
