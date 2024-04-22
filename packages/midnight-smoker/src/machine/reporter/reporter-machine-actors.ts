import {type CtrlEmitted} from '#machine/controller';
import {type SomeReporter} from '#reporter/reporter';
import {fromPromise} from 'xstate';

export interface DrainQueueInput {
  queue: CtrlEmitted[];
  reporter: SomeReporter;
}

/**
 * Drains the queue of events and invokes the listener for each event.
 */
export const drainQueue = fromPromise<void, DrainQueueInput>(
  async ({input: {reporter, queue}}): Promise<void> => {
    while (queue.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const event = queue.shift()!;
      const {type, ...rest} = event;

      // If this rejects, it should be a ReporterError.
      // @ts-expect-error TODO fix later
      await reporter.invokeListener({...rest, type});
    }
  },
);
