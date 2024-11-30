import {type PkgManagerContext} from 'midnight-smoker/defs/pkg-manager';
import {type SomePackError} from 'midnight-smoker/error';
import {PackEvents} from 'midnight-smoker/event';
import {type WorkspaceInfo} from 'midnight-smoker/pkg-manager';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';
import {uniqueId} from 'midnight-smoker/util';
import {type Actor, type ActorOptions, createActor} from 'xstate';

import {createDebug} from './debug';
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
  ctx: PkgManagerContext,
  workspaces: WorkspaceInfo[],
  {id, logger, ...actorOptions}: ActorOptions<typeof PackMachine> = {},
): Promise<PackMachineEmitted[]> => {
  id ??= uniqueId({prefix: 'pack-wrapper', suffix: envelope.spec.label});
  logger ??= createDebug(__filename);

  const actor: Actor<typeof PackMachine> = createActor(PackMachine, {
    id,
    logger,
    ...actorOptions,
    input: {ctx, envelope},
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
        if (results.length >= workspaces.length) {
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
    sender: 'pack-wrapper',
    type: 'PACK',
    workspaces,
  });

  try {
    return await promise;
  } finally {
    actor.stop();
    evtSubscription.unsubscribe();
    actorSubscription.unsubscribe();
  }
};
