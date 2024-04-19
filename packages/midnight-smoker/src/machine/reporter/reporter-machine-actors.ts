import {type ReporterListeners} from '#reporter';
import {type SomeReporter} from '#reporter/reporter';
import {fromPromise} from 'xstate';
import {type CtrlEmitted} from '../controller/control-machine-events';

export interface DrainQueueInput {
  listeners: Partial<ReporterListeners>;
  queue: CtrlEmitted[];
  reporter: SomeReporter;
}

export const drainQueue = fromPromise<void, DrainQueueInput>(
  async ({input: {reporter, queue}}): Promise<void> => {
    while (queue.length) {
      const event = queue.shift()!;
      const {type, ...rest} = event;
      // @ts-expect-error fix later
      await reporter.invokeListener({...rest, type});
    }
  },
);

export const teardownReporter = fromPromise<void, SomeReporter>(
  async ({input: reporter}): Promise<void> => {
    await reporter.teardown();
  },
);

export const setupReporter = fromPromise<void, SomeReporter>(
  async ({input: reporter}): Promise<void> => {
    await reporter.setup();
  },
);
