import {SmokerEvent} from '../../event/event-constants';
import type {ScriptRunnerEvents} from '../../event/script-runner-events';
import type {StrictEmitter} from '../../event/strict-emitter';
import {
  zScriptBeginNotifier,
  zScriptFailedNotifier,
  zScriptOkNotifier,
  type ScriptRunnerNotifiers,
} from '../schema/script-runner-schema';

export type ScriptRunnerEmitter = StrictEmitter<ScriptRunnerEvents>;

export function createScriptRunnerNotifiers(
  emitter: ScriptRunnerEmitter,
  total: number,
): ScriptRunnerNotifiers {
  let current = 0;
  const indices = new Map<string, number>();
  return {
    scriptBegin: zScriptBeginNotifier.implement((data) => {
      const idx = current++;
      indices.set(`${data.pkgName}:${data.script}`, idx);
      data.total ??= total;
      data.current ??= idx;
      emitter.emit(SmokerEvent.RunScriptBegin, data);
    }),
    scriptOk: zScriptOkNotifier.implement((data) => {
      const idxId = `${data.pkgName}:${data.script}`;
      data.total ??= total;
      data.current = indices.get(idxId)!;
      emitter.emit(SmokerEvent.RunScriptOk, data);
    }),
    scriptFailed: zScriptFailedNotifier.implement((data) => {
      const idxId = `${data.pkgName}:${data.script}`;
      data.total ??= total;
      data.current = indices.get(idxId)!;
      emitter.emit(SmokerEvent.RunScriptFailed, data);
    }),
  };
}
