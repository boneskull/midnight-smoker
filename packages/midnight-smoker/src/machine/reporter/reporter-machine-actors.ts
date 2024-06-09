import {fromUnknownError} from '#error/from-unknown-error';
import {LifecycleError} from '#error/lifecycle-error';
import {ReporterError} from '#error/reporter-error';
import {ReporterListenerError} from '#error/reporter-listener-error';
import {
  type DataForEvent,
  type EventName,
  type SomeDataForEvent,
} from '#event/events';
import {
  type ReporterContext,
  type ReporterDef,
  type ReporterListener,
  type ReporterListeners,
} from '#schema/reporter-def';
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
  ctx: ReporterContext;
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
  async ({input: {def, queue, ctx}}): Promise<void> => {
    while (queue.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const event = queue.shift()!;
      const listenerName = `on${event.type}` as keyof ReporterListeners;

      if (isFunction(def[listenerName])) {
        try {
          await invokeListener(def, ctx, event);
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

/**
 * Input for {@link setupReporter} and {@link teardownReporter}
 */
export interface ReporterLifecycleHookInput {
  def: ReporterDef;
  ctx: ReporterContext;
}

/**
 * Invokes the `setup` lifecycle hook of a reporter by calling the
 * {@link ReporterDef.setup} function (if present).
 */
export const setupReporter = fromPromise<void, ReporterLifecycleHookInput>(
  async ({input: {def, ctx}}) => {
    const {setup} = def;
    if (isFunction(setup)) {
      try {
        await setup(ctx);
      } catch (err) {
        throw new LifecycleError(
          fromUnknownError(err),
          'setup',
          'reporter',
          def.name,
          ctx.plugin,
        );
      }
    }
  },
);

/**
 * Invokes the `teardown` lifecycle hook of a reporter by calling the
 * {@link ReporterDef.teardown} function (if present).
 */
export const teardownReporter = fromPromise<void, ReporterLifecycleHookInput>(
  async ({input: {def, ctx}}) => {
    const {teardown} = def;
    if (isFunction(teardown)) {
      try {
        await teardown(ctx);
      } catch (err) {
        throw new LifecycleError(
          fromUnknownError(err),
          'teardown',
          'reporter',
          def.name,
          ctx.plugin,
        );
      }
    }
  },
);
