import {Events} from '#constants';
import {AbortError} from '#error/abort-error';
import {ReporterError} from '#error/reporter-error';
import {type EventData, type EventType} from '#event/events';
import {
  type ReporterContext,
  ReporterContextSubject,
} from '#reporter/reporter-context';
import {createDebug} from '#util/debug';
import {fromUnknownError} from '#util/from-unknown-error';
import {isAbortError} from '#util/guard/abort-error';
import {isFunction} from '#util/guard/common';
import {invert, mapValues} from 'lodash';
import {type EventEmitter} from 'node:stream';
import {fromPromise} from 'xstate';

import {
  type EventToListenerNameMap,
  type Reporter,
  type ReporterListener,
} from '../../defs/reporter';

const debug = createDebug(__filename);

const ListenerNames = mapValues(
  invert(Events),
  (value) => `on${value}` as const,
) as EventToListenerNameMap;

/**
 * Input object for {@link flushQueueLogic}
 */
export interface FlushQueueLogicInput {
  /**
   * Additional event emitter to emit events from
   *
   * This is _not_ used internally, and is instead provides alternate means of
   * listening for events by programmatic consumers
   */
  auxEmitter?: EventEmitter;

  /**
   * The reporter context belonging to {@link FlushQueueLogicInput.reporter}
   */
  ctx: ReporterContext;

  /**
   * The entire event queue
   */
  queue: EventData[];

  /**
   * The reporter definition
   */
  reporter: Reporter;
}

/**
 * Invokes a {@link ReporterListener} with the given event data.
 *
 * @param reporter Reporter definition
 * @param ctx Reporter definition's context
 * @param event Event data
 */
async function invokeListener<T extends EventType>(
  reporter: Reporter,
  ctx: ReporterContext,
  event: EventData<T>,
): Promise<void> {
  const listenerName = ListenerNames[event.type];
  const listener = reporter[listenerName] as ReporterListener<T, any>;
  await listener(ctx, event);
}

/**
 * Drains the queue of events and invokes the listener for each event.
 *
 * If an {@link FlushQueueLogicInput.auxEmitter} is provided, it will emit the
 * event(s). If any of the listeners throw, the error will be _re-emitted_ as an
 * `error` event on the emitter. This makes the listener of the `auxEmitter`
 * responsible for handling errors originating from its consumers.
 */
export const flushQueueLogic = fromPromise<void, FlushQueueLogicInput>(
  async ({
    input: {auxEmitter, ctx, queue, reporter},
    signal,
  }): Promise<void> => {
    while (queue.length) {
      if (signal.aborted) {
        throw new AbortError(signal.reason);
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const event = queue.shift()!;
      const {type} = event;
      const listenerName = ListenerNames[type];

      if (auxEmitter) {
        try {
          auxEmitter.emit(type, event);
        } catch (err) {
          debug('Aux emitter threw on %s: %O', type, err);
          try {
            auxEmitter.emit('error', err);
          } catch (err) {
            throw fromUnknownError(err, true);
          }
        }
      }

      const subject = ReporterContextSubject.getSubject(ctx);
      try {
        subject.next(event);
      } catch (err) {
        // XXX: I'm not sure this is the right thing to do
        if (isAbortError(err)) {
          return;
        }
        throw new ReporterError(err, reporter);
      }

      if (isFunction(reporter[listenerName])) {
        try {
          await invokeListener(reporter, ctx, event);
        } catch (err) {
          // XXX: I'm not sure this is the right thing to do
          if (isAbortError(err)) {
            return;
          }
          throw new ReporterError(err, reporter);
        }
      }
    }
  },
);
