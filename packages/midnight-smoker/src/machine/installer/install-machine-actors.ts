import {fromPromise} from 'xstate';
import {type InstallError} from '../../component';
import {
  type InstallActorOutput,
  type InstallActorParams,
} from './install-machine-types';

export const installActor = fromPromise<InstallActorOutput, InstallActorParams>(
  async ({
    self: {id},
    input: {signal, pkgManager, installManifest},
  }): Promise<InstallActorOutput> => {
    try {
      const result = await pkgManager.install(installManifest, signal);
      return {type: 'OK', ...result, id};
    } catch (error) {
      // TODO: fix
      return {type: 'ERROR', error: error as InstallError, installManifest, id};
    }
  },
);
