import {
  type CtrlInstallBeginEvent,
  type CtrlPackBeginEvent,
  type CtrlPkgManagerPackBeginEvent,
  type CtrlPkgManagerPackFailedEvent,
  type CtrlPkgManagerPackOkEvent,
} from '#machine/controller';
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
} from '#machine/util';
import {
  type PackError,
  type PackOptions,
  type PackParseError,
  type PkgManager,
} from '#pkg-manager';
import {type InstallManifest} from '#schema';
import {isEmpty} from 'lodash';
import {
  assign,
  enqueueActions,
  log,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {
  PackMachine,
  type PackMachineOutputError,
  type PackMachineOutputOk,
} from './pack-machine';
import {
  type PackerMachineEvents,
  type PackerMachinePackMachineDoneEvent,
  type PackerMachinePkgManagerPackBeginEvent,
} from './packer-machine-events';

export interface PackerMachineInput {
  signal: AbortSignal;
  opts: PackOptions;
  parentRef: AnyActorRef;
  pkgManagers: PkgManager[];
}

export interface PackerMachineContext extends PackerMachineInput {
  packMachineRefs: Record<string, ActorRefFrom<typeof PackMachine>>;
  error?: PackError | PackParseError;
  manifests: InstallManifest[];
}

export interface PackResult {
  installManifests: InstallManifest[];

  pkgManager: PkgManager;
}

export type PackerMachineOutputError = MachineOutputError<
  PackError | PackParseError
>;

export type PackerMachineOutputOk = MachineOutputOk<{
  manifests: InstallManifest[];
}>;

export type PackerMachineOutput =
  | PackerMachineOutputOk
  | PackerMachineOutputError;

export const PackerMachine = setup({
  types: {
    input: {} as PackerMachineInput,
    context: {} as PackerMachineContext,
    events: {} as PackerMachineEvents,
    output: {} as PackerMachineOutput,
  },
  actors: {
    PackMachine,
  },
  actions: {
    assignError: assign({
      error: (_, output: PackMachineOutputError) => {
        assertMachineOutputNotOk(output);
        return output.error;
      },
    }),
    assignManifests: assign({
      manifests: ({context: {manifests}}, output: PackMachineOutputOk) => {
        return isMachineOutputOk(output)
          ? [...manifests, ...output.installManifests]
          : manifests;
      },
    }),
    pack: assign({
      packMachineRefs: ({
        context: {pkgManagers, signal, opts, packMachineRefs},
        self,
        spawn,
      }) => ({
        ...packMachineRefs,
        ...Object.fromEntries(
          pkgManagers.map((pkgManager, index) => {
            const id = `PackMachine.${makeId()}`;
            const actorRef = spawn('PackMachine', {
              id,
              input: {
                pkgManager,
                signal,
                opts,
                parentRef: self,
                index: index + 1,
              },
            });
            return [id, monkeypatchActorLogger(actorRef, id)];
          }),
        ),
      }),
    }),
    sendPack: sendTo(({context: {parentRef}}) => parentRef, <
      CtrlPackBeginEvent
    >{
      type: 'PACK_BEGIN',
    }),
    sendInstall: sendTo(
      ({context: {parentRef}}) => parentRef,
      (_, output: PackResult): CtrlInstallBeginEvent => ({
        type: 'INSTALL_BEGIN',
        ...output,
      }),
    ),
    sendPkgManagerPackBeginEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self, context: {opts}},
        {pkgManager, index}: PackerMachinePkgManagerPackBeginEvent,
      ): CtrlPkgManagerPackBeginEvent => ({
        ...opts,
        type: 'PKG_MANAGER_PACK_BEGIN',
        index,
        pkgManager,
        sender: self.id,
      }),
    ),
    sendPkgManagerPackOkEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self},

        {output}: PackerMachinePackMachineDoneEvent,
      ): CtrlPkgManagerPackOkEvent => {
        assertMachineOutputOk(output);
        const {pkgManager, installManifests, index} = output;
        return {
          type: 'PKG_MANAGER_PACK_OK',
          index,
          pkgManager,
          installManifests,
          sender: self.id,
        };
      },
    ),
    sendPkgManagerPackFailedEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self},
        {output}: PackerMachinePackMachineDoneEvent,
      ): CtrlPkgManagerPackFailedEvent => {
        assertMachineOutputNotOk(output);
        const {pkgManager, error, index} = output;
        return {
          type: 'PKG_MANAGER_PACK_FAILED',
          index,
          pkgManager,
          error,
          sender: self.id,
        };
      },
    ),
    stopPackMachine: enqueueActions(
      ({enqueue, context: {packMachineRefs}}, {id}: MachineOutputLike) => {
        // enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = packMachineRefs;
        enqueue.assign({
          packMachineRefs: rest,
        });
      },
    ),
  },
  guards: {
    isPackingDone: ({context: {packMachineRefs}}) => isEmpty(packMachineRefs),
  },
}).createMachine({
  context: ({input}) => ({
    ...input,
    packMachineRefs: {},
    manifests: [],
  }),
  initial: 'packing',
  entry: [
    log(
      ({context: {pkgManagers}}) =>
        `PackerMachine will pack using ${pkgManagers.length} pkgManagers`,
    ),
    {type: 'sendPack'},
    {type: 'pack'},
  ],
  on: {
    PKG_MANAGER_PACK_BEGIN: {
      actions: [
        {
          type: 'sendPkgManagerPackBeginEvent',
          params: ({event}) => event,
        },
      ],
    },
  },
  id: 'PackerMachine',
  states: {
    packing: {
      on: {
        'xstate.done.actor.PackMachine.*': [
          {
            guard: ({event: {output}}) => isMachineOutputOk(output),
            actions: [
              {
                type: 'assignManifests',
                params: ({event: {output}}) => {
                  assertMachineOutputOk(output);
                  return output;
                },
              },
              {
                type: 'stopPackMachine',
                params: ({event: {output}}) => output,
              },
              {
                type: 'sendPkgManagerPackOkEvent',
                params: ({event}) => {
                  assertMachineOutputOk(event.output);
                  return event;
                },
              },
            ],
          },
          {
            guard: ({event: {output}}) => isMachineOutputNotOk(output),
            actions: [
              {
                type: 'stopPackMachine',
                params: ({event: {output}}) => output,
              },
              {
                type: 'assignError',
                params: ({event: {output}}) => {
                  assertMachineOutputNotOk(output);
                  return output;
                },
              },
              {
                type: 'sendPkgManagerPackFailedEvent',
                params: ({event}) => {
                  assertMachineOutputNotOk(event.output);
                  return event;
                },
              },
            ],
          },
        ],
      },
      always: [
        {
          guard: {type: 'isPackingDone'},
          target: 'done',
        },
      ],
    },
    done: {
      entry: [log('done')],
      type: 'final',
    },
  },
  output: ({self: {id}, context: {error, manifests}}) =>
    error ? {type: 'ERROR', error, id} : {type: 'OK', id, manifests},
});
