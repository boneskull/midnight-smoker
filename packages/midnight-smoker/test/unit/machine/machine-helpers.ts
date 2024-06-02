import {noop} from 'lodash';
import {scheduler} from 'timers/promises';
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

const DEFAULT_TIMEOUT = 1000;

export interface MachineRunnerOptions {
  logger?: (...args: any[]) => void;
  inspect?: (evt: InspectionEvent) => void;
  timeout?: number;
}

export function createMachineRunner<T extends AnyActorLogic>(
  machine: T,
  {
    logger: defaultLogger = noop,
    inspect: defaultInspector = noop,
    timeout: defaultTimeout = DEFAULT_TIMEOUT,
  }: MachineRunnerOptions = {},
) {
  const runMachine = async (
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      inspect = defaultInspector,
      timeout = defaultTimeout,
    }: MachineRunnerOptions = {},
  ): Promise<OutputFrom<T>> => {
    const actor = createActor(machine, {
      input,
      logger,
      inspect,
    });
    actor.start();
    return await Promise.race([
      toPromise(actor),
      scheduler.wait(timeout).then(() => {
        throw new Error(`Machine did not complete in ${timeout}ms`);
      }),
    ]);
  };

  const startMachine = (
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      inspect = defaultInspector,
    }: Omit<MachineRunnerOptions, 'timeout'> = {},
  ): Actor<T> => {
    const actor = createActor(machine, {
      input,
      logger,
      inspect,
    });
    actor.start();
    return actor;
  };

  const runUntilEvent = async (
    eventType: string | string[],
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      timeout = defaultTimeout,
    }: Omit<MachineRunnerOptions, 'inspect'> = {},
  ): Promise<void> => {
    const queue = [...castArray(eventType)];
    const actor = startMachine(input, {
      logger,
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
    try {
      await Promise.race([
        toPromise(actor),
        scheduler.wait(timeout).then(() => {
          const event = queue[0];
          if (event) {
            throw new Error(`Event "${queue[0]}" was not sent in ${timeout}ms`);
          }
          throw new Error(`Machine did not complete in ${timeout}ms`);
        }),
      ]);
      if (queue.length) {
        throw new Error(`Event ${queue[0]} was not sent`);
      }
    } finally {
      actor.stop();
    }
  };

  const runUntilSnapshot = async (
    predicate: (snapshot: SnapshotFrom<T>) => boolean,
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      inspect = defaultInspector,
      timeout = defaultTimeout,
    }: MachineRunnerOptions = {},
  ): Promise<SnapshotFrom<T>> => {
    const actor = startMachine(input, {
      logger,
      inspect,
    });
    try {
      return await waitFor(actor, predicate, {
        timeout,
      });
    } finally {
      actor.stop();
    }
  };

  const runUntilTransition = async (
    source: string,
    target: string,
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      timeout = defaultTimeout,
    }: Omit<MachineRunnerOptions, 'inspect'> = {},
  ): Promise<void> => {
    const actor = startMachine(input, {
      logger,
      inspect: (evt) => {
        if (
          evt.type === '@xstate.microstep' &&
          evt._transitions.some((tDef) => {
            return (
              tDef.source.id === source &&
              tDef.target?.some((t) => t.id === target)
            );
          })
        ) {
          actor.stop();
        }
      },
    });
    try {
      await Promise.race([
        toPromise(actor),
        scheduler.wait(timeout).then(() => {
          throw new Error(
            `Failed to find a transition from ${source} to ${target} in ${timeout}ms`,
          );
        }),
      ]);
    } finally {
      actor.stop();
    }
  };

  return {
    runMachine,
    startMachine,
    runUntilEvent,
    runUntilSnapshot,
    runUntilTransition,
  };
}
