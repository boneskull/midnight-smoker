import {
  PackEvents,
  type PkgManagerEnvelope,
  type PkgManagerPackContext,
  type SomePackError,
} from 'midnight-smoker';
import {type Actor, createActor} from 'xstate';

import {PackMachine, type PackMachineEmitted} from './pack-machine';

/**
 * Creates a `PackMachine`, emits the {@link PackMachinePackEvent}, then returns
 * the results of all `PkgPack*` events emitted from the machine.
 *
 * @param envelope Envelope describing the package manager, its plugin, and its
 *   spec
 * @param contexts Objects to pass to the `pack` method of the package manager
 */
export const pack = async (
  envelope: PkgManagerEnvelope,
  contexts: PkgManagerPackContext[],
): Promise<PackMachineEmitted[]> => {
  const actor: Actor<typeof PackMachine> = createActor(PackMachine, {
    input: {envelope},
  });

  const results: PackMachineEmitted[] = [];

  let resolve: (results: PackMachineEmitted[]) => void;
  let reject: (err: unknown) => void;

  const promise = new Promise<PackMachineEmitted[]>((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });

  const errors: SomePackError[] = [];

  const evtSubscription = actor.on('*', (evt) => {
    switch (evt.type) {
      case PackEvents.PkgPackFailed:
        errors.push(evt.error);
      // eslint-disable-next-line no-fallthrough
      case PackEvents.PkgPackOk:
        results.push(evt);
        if (results.length === contexts.length) {
          actor.stop();
        }
        break;
      default:
        break;
    }
  });

  const actorSubscription = actor.subscribe({
    complete: () => {
      if (errors.length > 0) {
        // TODO: new AggregateError
        reject(new AggregateError(errors));
        return;
      }
      resolve(results);
    },
    error: (err) => {
      reject(err);
    },
  });

  actor.start();
  actor.send({
    contexts,
    sender: 'pack-wrapper',
    type: 'PACK',
  });

  try {
    return await promise;
  } finally {
    actor.stop();
    evtSubscription.unsubscribe();
    actorSubscription.unsubscribe();
  }
};
