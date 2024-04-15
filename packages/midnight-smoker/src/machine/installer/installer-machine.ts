import {
  type InstallError,
  type InstallManifest,
  type PkgManager,
} from '#pkg-manager';
import {isEmpty} from 'lodash';
import {
  and,
  assign,
  enqueueActions,
  log,
  not,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {
  type CtrlInstallBeginEvent,
  type CtrlPkgManagerInstallBeginEvent,
  type CtrlPkgManagerInstallFailedEvent,
  type CtrlPkgManagerInstallOkEvent,
} from '../controller/control-machine-events';
import {
  assertMachineOutputNotOk,
  assertMachineOutputOk,
  isMachineOutputNotOk,
  isMachineOutputOk,
  makeId,
  monkeypatchActorLogger,
  type MachineOutputError,
  type MachineOutputLike,
  type MachineOutputOk,
} from '../machine-util';
import {type PackResult} from '../packer/packer-machine';
import {
  InstallMachine,
  type InstallMachineError,
  type InstallMachineOk,
  type InstallMachineOutput,
} from './install-machine';
import {type InstallerMachineEvents} from './installer-machine-events';

export interface InstallerMachineInput {
  signal: AbortSignal;
  parentRef: AnyActorRef;
}

export interface InstallerMachineContext extends InstallerMachineInput {
  queue: PackResult[];
  installMachineRefs: Record<string, ActorRefFrom<typeof InstallMachine>>;
  error?: InstallError;
  shouldFlush: boolean;
  manifests: InstallManifest[];
}

export type InstallerMachineOutputError = MachineOutputError<InstallError>;

export type InstallerMachineOutputOk = MachineOutputOk<{
  manifests: InstallManifest[];
}>;

export type InstallerMachineOutput =
  | InstallerMachineOutputOk
  | InstallerMachineOutputError;

export interface InstallOkParams {
  installManifests: InstallManifest[];
  pkgManager: PkgManager;
  index: number;
}

export interface InstallFailedParams {
  pkgManager: PkgManager;
  index: number;
  error: InstallError;
}

export const InstallerMachine = setup({
  types: {
    input: {} as InstallerMachineInput,
    context: {} as InstallerMachineContext,
    events: {} as InstallerMachineEvents,
    output: {} as InstallerMachineOutput,
  },
  actions: {
    enqueue: assign({
      queue: ({context: {queue}}, packResult: PackResult) => [
        ...queue,
        packResult,
      ],
    }),
    drain: assign({
      installMachineRefs: ({
        self,
        context: {queue, signal, installMachineRefs},
        spawn,
      }) => ({
        ...installMachineRefs,
        ...Object.fromEntries(
          queue.map(({pkgManager, installManifests}, index) => {
            const id = `InstallMachine.${makeId()}`;
            const actorRef = spawn('InstallMachine', {
              id,
              input: {
                signal,
                index: index + 1,
                pkgManager,
                installManifests,
                parentRef: self,
              },
            });
            return [id, monkeypatchActorLogger(actorRef, id)];
          }),
        ),
      }),
      queue: [],
    }),
    stopInstallMachine: enqueueActions(
      ({enqueue, context: {installMachineRefs}}, {id}: MachineOutputLike) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = installMachineRefs;
        enqueue.assign({
          installMachineRefs: rest,
        });
      },
    ),
    sendPkgManagerInstallBeginEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self},
        {
          index,
          installManifests,
          pkgManager,
        }: Omit<InstallMachineOk, 'id' | 'type'>,
      ): CtrlPkgManagerInstallBeginEvent => ({
        type: 'PKG_MANAGER_INSTALL_BEGIN',
        index,
        pkgManager,
        installManifests,
        sender: self.id,
      }),
    ),
    sendPkgManagerInstallOkEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self},
        {
          index,
          installManifests,
          pkgManager,
        }: Omit<InstallMachineOk, 'id' | 'type'>,
      ): CtrlPkgManagerInstallOkEvent => ({
        type: 'PKG_MANAGER_INSTALL_OK',
        index,
        pkgManager,
        installManifests,
        sender: self.id,
      }),
    ),
    sendPkgManagerInstallFailedEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self},
        {index, installManifests, error, pkgManager}: InstallMachineError,
      ): CtrlPkgManagerInstallFailedEvent => ({
        type: 'PKG_MANAGER_INSTALL_FAILED',
        index,
        installManifests,
        pkgManager,
        sender: self.id,
        error,
      }),
    ),
    sendWillInstallEvent: sendTo(({context: {parentRef}}) => parentRef, <
      CtrlInstallBeginEvent
    >{type: 'INSTALL_BEGIN'}),
    assignError: assign({
      error: (_, error: InstallError) => error,
    }),
    assignManifests: assign({
      manifests: ({context: {manifests}}, output: InstallMachineOk) => {
        return [...manifests, ...output.installManifests];
      },
    }),
  },
  actors: {
    InstallMachine,
  },
  guards: {
    shouldFlush: ({context: {shouldFlush}}) => shouldFlush,
    isQueueEmpty: ({context: {queue}}) => !queue.length,
    installOk: (_, output: InstallMachineOutput) => isMachineOutputOk(output),
    installNotOk: (_, output: InstallMachineOutput) =>
      isMachineOutputNotOk(output),
    isDoneInstalling: ({context: {installMachineRefs}}) =>
      isEmpty(installMachineRefs),
  },
}).createMachine({
  context: ({input}) => ({
    ...input,
    queue: [],
    installMachineRefs: {},
    shouldFlush: false,
    manifests: [],
  }),
  initial: 'draining',
  id: 'InstallerMachine',
  on: {
    PACKING_COMPLETE: {
      actions: [
        assign({
          shouldFlush: true,
        }),
      ],
    },
    INSTALL: [
      {
        guard: not('shouldFlush'),
        actions: [
          log(({event}) => `enqueueing for ${event.pkgManager.spec}`),
          {type: 'sendWillInstallEvent'},
          {type: 'enqueue', params: ({event}) => event},
        ],
      },
      {
        guard: 'shouldFlush',
        actions: [log('warning: got INSTALL event while flushing')],
      },
    ],
    PKG_MANAGER_INSTALL_BEGIN: {
      actions: [
        {
          type: 'sendPkgManagerInstallBeginEvent',
          params: ({event}) => event,
        },
      ],
    },
    'xstate.done.actor.InstallMachine.*': [
      {
        guard: {
          type: 'installOk',
          params: ({event: {output}}) => output,
        },
        actions: [
          log(({event: {output}}) => `installed for ${output.pkgManager.spec}`),
          {
            type: 'assignManifests',
            params: ({event: {output}}) => {
              assertMachineOutputOk(output);
              return output;
            },
          },
          {
            type: 'sendPkgManagerInstallOkEvent',
            params: ({event: {output}}) => {
              assertMachineOutputOk(output);
              return output;
            },
          },
          {
            type: 'stopInstallMachine',
            params: ({event: {output}}) => output,
          },
        ],
      },
      {
        guard: {
          type: 'installNotOk',
          params: ({event: {output}}) => output,
        },
        actions: [
          log(
            ({event: {output}}) =>
              `failed to install for ${output.pkgManager.spec}`,
          ),
          {
            type: 'assignError',
            params: ({event: {output}}) => {
              assertMachineOutputNotOk(output);
              return output.error;
            },
          },
          {
            type: 'sendPkgManagerInstallFailedEvent',
            params: ({event: {output}}) => {
              assertMachineOutputNotOk(output);
              return output;
            },
          },
          {
            type: 'stopInstallMachine',
            params: ({event: {output}}) => output,
          },
        ],
      },
    ],
  },
  states: {
    draining: {
      entry: [log('waiting for events...')],
      always: [
        {
          guard: not('isQueueEmpty'),
          actions: [log('draining queue'), {type: 'drain'}],
        },
        {
          guard: and(['isQueueEmpty', 'shouldFlush', 'isDoneInstalling']),
          target: 'done',
          actions: [log('no more events to process')],
        },
      ],
    },
    done: {
      type: 'final',
    },
  },
  output: ({self: {id}, context: {error, manifests}}) =>
    error ? {type: 'ERROR', error, id} : {type: 'OK', id, manifests},
});
