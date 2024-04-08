import {fromPromise, type ActorRefFrom} from 'xstate';
import {type PkgManagerMachine} from '../pkg-manager/pkg-manager-machine';

export {
  PkgManagerMachine,
  type PMMOutput,
  type PMMOutputError,
  type PMMOutputOk,
} from '../pkg-manager/pkg-manager-machine';
export {
  PluginLoaderMachine,
  type PluginLoaderOutput,
} from '../plugin-loader-machine';
export type {SRMOutput, SRMOutputResult} from '../script-runner-machine';

export const cleanupActor = fromPromise<
  void,
  Record<string, ActorRefFrom<typeof PkgManagerMachine>>
>(async ({input: pkgManagerMachines}) => {
  await Promise.all(
    Object.values(pkgManagerMachines).map((pkgManagerMachine) => {
      pkgManagerMachine.send({type: 'HALT'});
    }),
  );
});
