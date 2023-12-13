/**
 * The `EventEmitter` which {@link midnight-smoker!Smoker Smoker} extends to emit
 * well-typed {@link SmokerEvents events}.
 */

import {EventEmitter} from 'node:events';
import type {StrictEventEmitter} from 'strict-event-emitter-types';
import type {Class} from 'type-fest';

export function createStrictEmitter<T>(): Class<StrictEmitter<T>> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const TypedEmitter: new () => StrictEventEmitter<EventEmitter, T> =
    EventEmitter as any;
  return TypedEmitter;
}

export type StrictEmitter<T> = StrictEventEmitter<EventEmitter, T>;
