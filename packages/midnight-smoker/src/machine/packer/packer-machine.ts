import {
  type CtrlPackBeginEvent,
  type CtrlPkgManagerPackBeginEvent,
  type CtrlPkgManagerPackFailedEvent,
  type CtrlPkgManagerPackOkEvent,
} from '#machine/controller';
import {
  assertActorOutputNotOk,
  assertActorOutputOk,
  isActorOutputNotOk,
  isActorOutputOk,
  makeId,
  monkeypatchActorLogger,
  type MachineOutputLike,
} from '#machine/util';
import {isEmpty} from 'lodash';
import {assign, enqueueActions, log, sendTo, setup} from 'xstate';
import {PackMachine} from './pack-machine';
import {
  type PackMachineOutputError,
  type PackMachineOutputOk,
} from './pack-machine-types';
import {
  type PackerMachineEvents,
  type PackerMachinePackMachineDoneEvent,
  type PackerMachinePkgManagerPackBeginEvent,
} from './packer-machine-events';
import {
  type PackerMachineContext,
  type PackerMachineInput,
  type PackerMachineOutput,
} from './packer-machine-types';

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
        assertActorOutputNotOk(output);
        return output.error;
      },
    }),
    assignManifests: assign({
      manifests: ({context: {manifests}}, output: PackMachineOutputOk) => {
        return isActorOutputOk(output)
          ? [...manifests, ...output.installManifests]
          : manifests;
      },
    }),
    pack: assign({
      packMachineRefs: ({
        context: {pkgManagers, signal, workspaceInfo, packMachineRefs},
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
                workspaceInfo,
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
    sendPkgManagerPackBeginEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self, context: {opts, workspaceInfo}},
        {pkgManager, index}: PackerMachinePkgManagerPackBeginEvent,
      ): CtrlPkgManagerPackBeginEvent => ({
        ...opts,
        type: 'PKG_MANAGER_PACK_BEGIN',
        index,
        pkgManager,
        sender: self.id,
        workspaceInfo,
      }),
    ),
    sendPkgManagerPackOkEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self},
        {output}: PackerMachinePackMachineDoneEvent,
      ): CtrlPkgManagerPackOkEvent => {
        assertActorOutputOk(output);
        const {pkgManager, installManifests, index, workspaceInfo} = output;
        return {
          type: 'PKG_MANAGER_PACK_OK',
          index,
          pkgManager,
          installManifests,
          sender: self.id,
          workspaceInfo,
        };
      },
    ),
    sendPkgManagerPackFailedEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self},
        {output}: PackerMachinePackMachineDoneEvent,
      ): CtrlPkgManagerPackFailedEvent => {
        assertActorOutputNotOk(output);
        const {pkgManager, error, index, workspaceInfo} = output;
        return {
          type: 'PKG_MANAGER_PACK_FAILED',
          index,
          workspaceInfo,
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
      ({context}) =>
        `PackerMachine will pack using ${context.pkgManagers.length} pkgManagers`,
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
        PKG_PACK_FAILED: {
          actions: [
            log('got PKG_PACK_FAILED'),
            sendTo(
              ({context: {parentRef}}) => parentRef,
              ({event: {pkgManager, ...event}, context}) => ({
                ...event,
                pkgManager: pkgManager.staticSpec,
                totalPkgs: context.workspaceInfo.length,
              }),
            ),
          ],
        },
        PKG_PACK_BEGIN: {
          actions: [
            log('got PKG_PACK_BEGIN'),
            sendTo(
              ({context: {parentRef}}) => parentRef,
              ({event: {pkgManager, ...event}, context}) => ({
                ...event,
                pkgManager: pkgManager.staticSpec,
                totalPkgs: context.workspaceInfo.length,
              }),
            ),
          ],
        },
        PKG_PACK_OK: {
          actions: [
            log('got PKG_PACK_OK'),
            sendTo(
              ({context: {parentRef}}) => parentRef,
              ({event: {pkgManager, ...event}, context}) => ({
                ...event,
                pkgManager: pkgManager.staticSpec,
                totalPkgs: context.workspaceInfo.length,
              }),
            ),
          ],
        },
        'xstate.done.actor.PackMachine.*': [
          {
            guard: ({event: {output}}) => isActorOutputOk(output),
            actions: [
              {
                type: 'assignManifests',
                params: ({event: {output}}) => {
                  assertActorOutputOk(output);
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
                  assertActorOutputOk(event.output);
                  return event;
                },
              },
            ],
          },
          {
            guard: ({event: {output}}) => isActorOutputNotOk(output),
            actions: [
              {
                type: 'stopPackMachine',
                params: ({event: {output}}) => output,
              },
              {
                type: 'assignError',
                params: ({event: {output}}) => {
                  assertActorOutputNotOk(output);
                  return output;
                },
              },
              {
                type: 'sendPkgManagerPackFailedEvent',
                params: ({event}) => {
                  assertActorOutputNotOk(event.output);
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
