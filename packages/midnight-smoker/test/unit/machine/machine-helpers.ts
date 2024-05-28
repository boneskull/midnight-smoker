import {noop} from 'lodash';
import {
  createActor,
  toPromise,
  waitFor,
  type Actor,
  type AnyActorLogic,
  type InputFrom,
  type InspectionEvent,
  type OutputFrom,
  type SnapshotFrom,
} from 'xstate';
import {castArray} from '../../../src/util/util';

export interface MachineRunnerOptions {
  logger?: (...args: any[]) => void;
  inspect?: (evt: InspectionEvent) => void;
}

export function createMachineRunner<T extends AnyActorLogic>(
  machine: T,
  {logger = noop, inspect = noop}: MachineRunnerOptions = {},
) {
  const runMachine = (
    input: InputFrom<T>,
    options: MachineRunnerOptions = {},
  ): Promise<OutputFrom<T>> => {
    const actor = createActor(machine, {
      input,
      logger: options.logger ?? logger,
      inspect: options.inspect ?? inspect,
    });
    actor.start();
    return toPromise(actor);
  };

  const startMachine = (
    input: InputFrom<T>,
    options: MachineRunnerOptions = {},
  ): Actor<T> => {
    const actor = createActor(machine, {
      input,
      logger: options.logger ?? logger,
      inspect: options.inspect ?? inspect,
    });
    actor.start();
    return actor;
  };

  const runUntilEvent = async (
    eventType: string | string[],
    input: InputFrom<T>,
    options: Omit<MachineRunnerOptions, 'inspect'> = {},
  ): Promise<void> => {
    const queue = [...castArray(eventType)];
    const actor = startMachine(input, {
      logger: options.logger ?? logger,
      inspect: (evt) => {
        if (
          evt.type === '@xstate.event' &&
          queue[0] === evt.event.type &&
          evt.sourceRef === actor
        ) {
          queue.shift();
          if (!queue.length) {
            actor.stop();
          }
        }
      },
    });
    await toPromise(actor);
    if (queue.length) {
      throw new Error(`Event ${queue[0]} was never sent`);
    }
  };

  const runUntilSnapshot = async (
    predicate: (snapshot: SnapshotFrom<T>) => boolean,
    input: InputFrom<T>,
    options: MachineRunnerOptions = {},
  ): Promise<SnapshotFrom<T>> => {
    const actor = startMachine(input, {
      logger: options.logger ?? logger,
      inspect: options.inspect ?? inspect,
    });
    try {
      return await waitFor(actor, predicate);
    } finally {
      actor.stop();
    }
  };

  return {
    runMachine,
    startMachine,
    runUntilEvent,
    runUntilSnapshot,
  };
}
