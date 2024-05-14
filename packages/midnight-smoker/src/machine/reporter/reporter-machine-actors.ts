import {fromUnknownError, ReporterError} from '#error';
import {type DataForEvent, type EventName} from '#event';
import {type CtrlMachineEmitted} from '#machine/control';
import {
  type ReporterListener,
  type ReporterListeners,
  type SomeReporterContext,
  type SomeReporterDef,
} from '#schema/reporter-def';
import {isFunction} from 'lodash';
import {fromPromise} from 'xstate';

export interface DrainQueueInput {
  queue: CtrlMachineEmitted[];
  def: SomeReporterDef;

  ctx: SomeReporterContext;
}

async function invokeListener<T extends EventName>(
  def: SomeReporterDef,
  ctx: SomeReporterContext,
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

export interface SetupReporterInput {
  def: SomeReporterDef;
  ctx: SomeReporterContext;
}

export const setupReporter = fromPromise<void, SetupReporterInput>(
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

export interface TeardownReporterInput {
  def: SomeReporterDef;
  ctx: SomeReporterContext;
}

export const teardownReporter = fromPromise<void, TeardownReporterInput>(
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
