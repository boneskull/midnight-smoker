import {
  createActor,
  toPromise,
  type Actor,
  type AnyActorLogic,
  type InputFrom,
  type OutputFrom,
} from 'xstate';

export function createMachineRunner<T extends AnyActorLogic>(machine: T) {
  const runMachine = (input: InputFrom<T>): Promise<OutputFrom<T>> => {
    const actor = createActor(machine, {
      input,
      logger: () => {},
    });
    actor.start();
    return toPromise(actor);
  };

  const startMachine = (input: InputFrom<T>): Actor<T> => {
    const actor = createActor(machine, {
      input,
      logger: () => {},
    });
    actor.start();
    return actor;
  };

  return {runMachine, startMachine};
}
