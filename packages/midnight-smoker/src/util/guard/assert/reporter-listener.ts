import {type ReporterListener} from '#defs/reporter';
import {type EventType} from '#event/events';
import {ok} from '#util/assert';
import {isReporterListenerFn} from '#util/guard/reporter-listener';

export function assertReporterListenerFn<
  T extends EventType = EventType,
  Ctx extends object = object,
>(value: unknown): asserts value is ReporterListener<T, Ctx> {
  ok(isReporterListenerFn(value), 'Expected a ReporterListener');
}
