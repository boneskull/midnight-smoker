import {
  assertActorOutputNotOk,
  assertActorOutputOk,
  isActorOutputNotOk,
  isActorOutputOk,
} from '#machine/util';
import {type InstallError} from '#pkg-manager';
import {type ExecResult, type InstallManifest} from '#schema';
import {isEmpty} from 'lodash';
import assert from 'node:assert';
import {assign, enqueueActions, log, not, sendTo, setup} from 'xstate';
import {installActor} from './install-machine-actors';
import {
  type InstallMachineContext,
  type InstallMachineInput,
  type InstallMachineOutput,
} from './install-machine-types';
import {
  type InstallerMachinePkgInstallBeginEvent,
  type InstallerMachinePkgInstallFailedEvent,
  type InstallerMachinePkgInstallOkEvent,
  type InstallerMachinePkgManagerInstallBeginEvent,
} from './installer-machine-events';

export const InstallMachine = setup({
  types: {
    input: {} as InstallMachineInput,
    context: {} as InstallMachineContext,
    output: {} as InstallMachineOutput,
  },
  actions: {
    sendPkgManagerInstallBegin: sendTo(
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
    sendPkgInstallBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context},
        {
          installManifest,
          index,
        }: {installManifest: InstallManifest; index: number},
      ): InstallerMachinePkgInstallBeginEvent => {
        const {pkgManager} = context;
        return {
          type: 'PKG_INSTALL_BEGIN',
          installManifest,
          pkgManager,
          currentPkg: index,
        };
      },
    ),
    sendPkgInstallOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context},
        {
          rawResult,
          installManifest,
          index,
        }: {
          rawResult: ExecResult;
          installManifest: InstallManifest;
          index: number;
        },
      ): InstallerMachinePkgInstallOkEvent => {
        const {pkgManager} = context;
        return {
          type: 'PKG_INSTALL_OK',
          rawResult,
          installManifest,
          pkgManager,
          currentPkg: index,
        };
      },
    ),
    sendPkgInstallFailed: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context},
        {
          error,
          installManifest,
          index,
        }: {
          error: InstallError;
          installManifest: InstallManifest;
          index: number;
        },
      ): InstallerMachinePkgInstallFailedEvent => {
        const {pkgManager} = context;
        return {
          type: 'PKG_INSTALL_FAILED',
          error,
          installManifest,
          pkgManager,
          currentPkg: index,
        };
      },
    ),
    take: enqueueActions(({enqueue, context: {installManifestQueue}}) => {
      const newQueue = [...installManifestQueue];
      const currentManifest = newQueue.shift();
      enqueue.assign({currentManifest, installManifestQueue: newQueue});
    }),
    assignError: assign({
      error: (_, {error}: {error: InstallError}) => error,
    }),
  },
  actors: {
    install: installActor,
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    hasNext: not('isComplete'),
    isComplete: ({context: {installManifestQueue}}) =>
      isEmpty(installManifestQueue),
    hasCurrent: ({context: {currentManifest}}) => Boolean(currentManifest),
  },
}).createMachine({
  id: 'InstallMachine',
  context: ({input}) => {
    const [currentManifest, ...installManifestQueue] = input.installManifests;
    return {
      ...input,
      installManifestQueue,
      currentManifest,
    };
  },
  initial: 'installing',
  entry: [{type: 'sendPkgManagerInstallBegin'}],
  always: {
    guard: 'hasError',
    actions: [log(({context: {error}}) => `ERROR: ${error?.message}`)],
  },
  states: {
    installing: {
      invoke: {
        src: 'install',
        input: ({context: {currentManifest, signal, pkgManager}}) => {
          assert.ok(currentManifest);
          return {
            pkgManager,
            installManifest: currentManifest,
            signal,
          };
        },
        onDone: [
          {
            description: 'install done',
            guard: ({event: {output}}) => isActorOutputOk(output),
            actions: [
              log('install ok'),
              {
                type: 'sendPkgInstallOk',
                params: ({
                  event: {output},
                  context: {installManifests, installManifestQueue},
                }) => {
                  assertActorOutputOk(output);
                  const {installManifest, rawResult} = output;
                  return {
                    index:
                      installManifests.length - installManifestQueue.length,
                    rawResult,
                    installManifest,
                  };
                },
              },
            ],
            target: '#InstallMachine.next',
          },
          {
            guard: ({event: {output}}) => isActorOutputNotOk(output),
            actions: [
              log('install failed'),
              {
                type: 'assignError',
                params: ({event: {output}}) => {
                  assertActorOutputNotOk(output);
                  return output;
                },
              },
              {
                type: 'sendPkgInstallFailed',
                params: ({
                  event: {output},
                  context: {installManifests, installManifestQueue},
                }) => {
                  assertActorOutputNotOk(output);
                  const {error, installManifest} = output;
                  return {
                    index:
                      installManifests.length - installManifestQueue.length,
                    error,
                    installManifest,
                  };
                },
              },
            ],
            target: '#InstallMachine.next',
          },
        ],
      },
    },
    next: {
      always: [
        {
          guard: {type: 'isComplete'},
          target: '#InstallMachine.done',
        },
        {
          guard: {type: 'hasNext'},
          actions: [{type: 'take'}],
          target: '#InstallMachine.installing',
        },
      ],
    },
    done: {
      type: 'final',
    },
  },
  output: ({
    self: {id},
    context: {pkgManager, error, index, installManifests},
  }) =>
    error
      ? {type: 'ERROR', error, id, pkgManager, index, installManifests}
      : {type: 'OK', installManifests, id, pkgManager, index},
});
