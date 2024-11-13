/**
 * Provides {@link isReporterListenerFn}.
 *
 * @packageDocumentation
 */

import {type ReporterListener} from '#defs/reporter';
import {type EventType} from '#event/events';
import {ReporterListenerFnSchema} from '#schema/reporter';

export const isReporterListenerFn = <
  T extends EventType = EventType,
  Ctx extends object = object,
>(
  value: unknown,
): value is ReporterListener<T, Ctx> =>
  ReporterListenerFnSchema.safeParse(value).success;
