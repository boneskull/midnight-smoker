import {fromUnknownError} from '#error/from-unknown-error';
import {ReporterError} from '#error/reporter-error';
import {type DataForEvent, type EventData, type EventName} from '#event/events';
import {
  type ReporterContext,
  type ReporterDef,
  type ReporterListener,
  type ReporterListeners,
} from '#schema/reporter-def';
import {isFunction} from 'lodash';
import {fromPromise} from 'xstate';

export interface DrainQueueInput {
  queue: DataForEvent<keyof EventData>[];
  def: ReporterDef;

  ctx: ReporterContext;
}

async function invokeListener<T extends EventName>(
  def: ReporterDef,
  ctx: ReporterContext,
  data: DataForEvent<T>,
) {
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
        await invokeListener(def, ctx, event);
      }
    }
  },
);

export interface ReporterLifecycleHookInput {
  def: ReporterDef;
  ctx: ReporterContext;
}

export const setupReporter = fromPromise<void, ReporterLifecycleHookInput>(
  async ({input: {def, ctx}}) => {
    await Promise.resolve();
    const {setup} = def;
    if (isFunction(setup)) {
      try {
        await setup(ctx);
      } catch (err) {
        throw new ReporterError(fromUnknownError(err), def);
      }
    }
  },
);

export const teardownReporter = fromPromise<void, ReporterLifecycleHookInput>(
  async ({input: {def, ctx}}) => {
    await Promise.resolve();
    const {teardown} = def;
    if (isFunction(teardown)) {
      try {
        await teardown(ctx);
      } catch (err) {
        throw new ReporterError(fromUnknownError(err), def);
      }
    }
  },
);
