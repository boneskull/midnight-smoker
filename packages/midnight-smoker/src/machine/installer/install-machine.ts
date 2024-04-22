import {type MachineOutputError, type MachineOutputOk} from '#machine/util';
import {type InstallError, type PkgManager} from '#pkg-manager';
import {
  type ExecResult,
  type InstallManifest,
  type InstallResult,
} from '#schema';
import {
  assign,
  fromPromise,
  log,
  sendTo,
  setup,
  type AnyActorRef,
} from 'xstate';
import {type InstallerMachinePkgManagerInstallBeginEvent} from './installer-machine-events';

export interface InstallMachineInput {
  pkgManager: PkgManager;
  installManifests: InstallManifest[];
  signal: AbortSignal;
  index: number;
  parentRef: AnyActorRef;
}

export interface InstallMachineContext extends InstallMachineInput {
  rawResult?: ExecResult;
  error?: InstallError;
}

export type InstallMachineOk = MachineOutputOk<
  Pick<
    InstallMachineContext,
    'pkgManager' | 'index' | 'rawResult' | 'installManifests'
  >
>;

export type InstallMachineError = MachineOutputError<
  InstallError,
  Pick<InstallMachineContext, 'pkgManager' | 'index' | 'installManifests'>
>;

export type InstallActorParams = Pick<
  InstallMachineContext,
  'pkgManager' | 'installManifests' | 'signal'
>;

export type InstallMachineOutput = InstallMachineOk | InstallMachineError;

export const installActor = fromPromise<InstallResult, InstallActorParams>(
  async ({
    input: {signal, pkgManager, installManifests},
  }): Promise<InstallResult> => pkgManager.install(installManifests, signal),
);

export const InstallMachine = setup({
  types: {
    input: {} as InstallMachineInput,
    context: {} as InstallMachineContext,
    output: {} as InstallMachineOutput,
  },
  actions: {
    installOk: assign({
      rawResult: (_, rawResult: ExecResult) => rawResult,
    }),
    sendInstallBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): InstallerMachinePkgManagerInstallBeginEvent => {
        const {pkgManager, installManifests, index} = context;
        return {
          type: 'PKG_MANAGER_INSTALL_BEGIN',
          installManifests,
          pkgManager,
          index,
        };
      },
    ),
  },
  actors: {
    install: installActor,
  },
}).createMachine({
  id: 'InstallMachine',
  context: ({input}) => input,
  initial: 'installing',
  entry: [log(({context}) => `Installing for ${context.pkgManager.spec}`)],
  states: {
    installing: {
      entry: [{type: 'sendInstallBegin'}],
      invoke: {
        id: 'installActor',
        src: 'install',
        input: ({context: {installManifests, signal, pkgManager}}) => ({
          pkgManager,
          installManifests,
          signal,
        }),
        onDone: {
          description: 'install done',
          actions: [
            log('install ok'),
            {
              type: 'installOk',
              params: ({
                event: {
                  output: {rawResult},
                },
              }) => rawResult,
            },
          ],
          target: 'done',
        },
        onError: {
          actions: [
            log('install failed'),
            assign({
              error: ({event: {error}}) => error as InstallError,
            }),
          ],
          target: 'done',
        },
      },
    },
    done: {
      type: 'final',
    },
  },
  output: ({
    self: {id},
    context: {pkgManager, rawResult, error, index, installManifests},
  }) =>
    error
      ? {type: 'ERROR', error, id, pkgManager, index, installManifests}
      : {type: 'OK', rawResult, installManifests, id, pkgManager, index},
});
