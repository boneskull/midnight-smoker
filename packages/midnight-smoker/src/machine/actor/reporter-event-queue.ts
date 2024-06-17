import {ReporterError} from '#error/reporter-error';
import {ReporterListenerError} from '#error/reporter-listener-error';
import {
  type DataForEvent,
  type EventName,
  type SomeDataForEvent,
} from '#event/events';
import {type PartialReporterContext} from '#machine/reporter/reporter-machine-events';
import {type ReporterContext} from '#schema/reporter-context';
import {
  type ReporterDef,
  type ReporterListener,
  type ReporterListeners,
} from '#schema/reporter-def';
import {fromUnknownError} from '#util/error-util';
import {isFunction} from 'lodash';
import {fromPromise} from 'xstate';

/**
 * Input object for {@link drainQueue}
 */
export interface DrainQueueInput {
  /**
   * The entire event queue
   */
  queue: SomeDataForEvent[];

  /**
   * The reporter definition
   */
  def: ReporterDef;

  /**
   * The reporter context belonging to {@link DrainQueueInput.def}
   */
  ctx: PartialReporterContext;
}

/**
 * Invokes a {@link ReporterListener} with the given event data.
 *
 * @param def Reporter definition
 * @param ctx Reporter definition's context
 * @param data Event data
 * @internal
 */
async function invokeListener<T extends EventName>(
  def: ReporterDef,
  ctx: ReporterContext,
  data: DataForEvent<T>,
): Promise<void> {
  const listenerName = `on${data.type}` as keyof ReporterListeners;
  const listener = def[listenerName] as ReporterListener<T, any>;
  try {
    await listener(ctx, data);
  } catch (err) {
    throw new ReporterError(fromUnknownError(err), def);
  }
}

/**
 * Drains the queue of events and invokes the listener for each event.
 */
export const drainQueue = fromPromise<void, DrainQueueInput>(
  async ({input: {def, queue, ctx}, signal}): Promise<void> => {
    while (queue.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const event = queue.shift()!;
      const listenerName = `on${event.type}` as keyof ReporterListeners;

      if (isFunction(def[listenerName])) {
        try {
          await invokeListener(def, {...ctx, signal}, event);
        } catch (err) {
          throw new ReporterListenerError(
            fromUnknownError(err),
            event,
            listenerName,
            def.name,
            ctx.plugin,
          );
        }
      }
    }
  },
);
