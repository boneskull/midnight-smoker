import {Events} from '#constants';
import {
  type EventTypeToListenerName,
  type Reporter,
  type ReporterListener,
} from '#defs/reporter';
import {ReporterError} from '#error/reporter-error';
import {type EventData, type EventType} from '#event/events';
import {
  type ReporterContext,
  type ReporterContextSubject,
} from '#reporter/reporter-context';
import {ok} from '#util/assert';
import {createDebug} from '#util/debug';
import {isReporterListenerFn} from '#util/guard/reporter-listener';
import {invert, mapValues} from 'lodash';
import {type EventEmitter} from 'node:stream';
import {fromPromise} from 'xstate';

const debug = createDebug(__filename);

const ListenerNames = mapValues(
  invert(Events),
  (value) => `on${value}` as const,
) as EventTypeToListenerName;

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

  subject?: ReporterContextSubject;
}

/**
 * Invokes a {@link ReporterListener} with the given event data.
 *
 * @param reporter Reporter definition
 * @param ctx Reporter definition's context
 * @param event Event data
 */
const invokeListener = async <T extends EventType>(
  reporter: Reporter,
  ctx: ReporterContext,
  event: EventData<T>,
): Promise<void> => {
  const listenerName = ListenerNames[event.type];
  const listener = reporter[listenerName] as ReporterListener<T> | undefined;
  ok(listener, `Listener not found: ${listenerName}`);
  await listener(ctx, event);
};

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
    input: {auxEmitter, ctx, queue, reporter, subject},
    signal,
  }): Promise<void> => {
    // this is necessary so we can abort the actor early if the signal pops.
    // ZALGO WUZ HERE
    await Promise.resolve();

    while (queue.length) {
      if (signal.aborted) {
        return;
      }

      const event = queue.shift()!;
      const {type} = event;

      if (auxEmitter?.listenerCount(type)) {
        try {
          // do not catch an re-emit "error" event
          auxEmitter.emit(type, event);
        } catch (err) {
          debug('Aux emitter threw on %s: %O', type, err);
          throw new ReporterError(err, reporter);
        }
      }

      if (subject) {
        try {
          // do not catch and call "error" method
          subject.next(event);
        } catch (err) {
          throw new ReporterError(err, reporter);
        }
      }

      const reporterListenerName = ListenerNames[type];
      // XXX: is this too strict?
      if (isReporterListenerFn(reporter[reporterListenerName])) {
        try {
          await invokeListener(reporter, ctx, event);
        } catch (err) {
          throw new ReporterError(err, reporter);
        }
      }
    }
  },
);
