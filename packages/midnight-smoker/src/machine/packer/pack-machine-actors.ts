import {type PackError, type PackParseError} from '#error';
import {type ActorOutputError, type ActorOutputOk} from '#machine';
import {fromPromise} from 'xstate';
import {type InstallManifest, type PkgManager} from '../../component';

export type PackActorOutput = PackActorOutputOk | PackActorOutputFailed;

export type PackActorOutputFailed = ActorOutputError<
  PackError | PackParseError,
  {
    index: number;
    localPath: string;
  }
>;

export type PackActorOutputOk = ActorOutputOk<{
  installManifest: InstallManifest;
  index: number;
}>;

export interface PackActorInput {
  index: number;
  localPath: string;
  pkgManager: PkgManager;
  signal: AbortSignal;
}

export const pack = fromPromise<PackActorOutput, PackActorInput>(
  async ({
    self: {id},
    input: {index, signal, pkgManager, localPath},
  }): Promise<PackActorOutput> => {
    try {
      const installManifest = await pkgManager.pack(localPath, signal);
      return {type: 'OK', installManifest, index, id};
    } catch (err) {
      return {
        type: 'ERROR',
        localPath,
        index,
        error: err as PackError | PackParseError,
        id,
      };
    }
  },
);
