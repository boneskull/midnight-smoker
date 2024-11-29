import {
  type InstallManifest,
  type PkgManagerContext,
} from 'midnight-smoker/defs/pkg-manager';
import {type InstallError} from 'midnight-smoker/error';
import {InstallEvents} from 'midnight-smoker/event';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';
import {uniqueId} from 'midnight-smoker/util';
import {type Actor, type ActorOptions, createActor} from 'xstate';

import {createDebug} from './debug';
import {InstallMachine, type InstallMachineEmitted} from './install-machine';

/**
 * Creates an `InstallMachine`, emits the {@link InstallMachineInstallEvent},
 * then returns the results of all `PkgInstall*` events emitted from the
 * machine.
 *
 * @param envelope Envelope describing the package manager, its plugin, and its
 *   spec
 * @param contexts Objects to pass to the `install` method of the package
 *   manager
 */
export const install = async (
  manifests: InstallManifest[],
  envelope: PkgManagerEnvelope,
  ctx: PkgManagerContext,
  {id, logger, ...actorOptions}: ActorOptions<typeof InstallMachine> = {},
): Promise<InstallMachineEmitted[]> => {
  id ??= uniqueId({prefix: 'install-wrapper', suffix: envelope.spec.label});
  logger ??= createDebug(__filename);

  const actor: Actor<typeof InstallMachine> = createActor(InstallMachine, {
    id,
    logger,
    ...actorOptions,
    input: {ctx, envelope},
  });

  const results: InstallMachineEmitted[] = [];

  let resolve: (results: InstallMachineEmitted[]) => void;
  let reject: (err: unknown) => void;

  const promise = new Promise<InstallMachineEmitted[]>((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });

  const errors: InstallError[] = [];

  const evtSubscription = actor.on('*', (evt) => {
    switch (evt.type) {
      case InstallEvents.PkgInstallFailed:
        errors.push(evt.error);
      // eslint-disable-next-line no-fallthrough
      case InstallEvents.PkgInstallOk:
        results.push(evt);
        if (results.length >= manifests.length) {
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
    manifests,
    sender: 'install-wrapper',
    type: 'INSTALL',
  });

  try {
    return await promise;
  } finally {
    actor.stop();
    evtSubscription.unsubscribe();
    actorSubscription.unsubscribe();
  }
};
