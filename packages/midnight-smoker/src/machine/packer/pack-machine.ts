import {
  assertActorOutputNotOk,
  assertActorOutputOk,
  makeId,
} from '#machine/util';
import {assign, enqueueActions, log, sendTo, setup} from 'xstate';
import {pack} from './pack-machine-actors';
import {
  type PackMachineContext,
  type PackMachineEvents,
  type PackMachineInput,
  type PackMachineOutput,
} from './pack-machine-types';
import {
  type PackerMachinePkgManagerPackBeginEvent,
  type PackerMachinePkgPackFailedEvent,
  type PackerMachinePkgPackOkEvent,
} from './packer-machine-events';

export const PackMachine = setup({
  types: {
    input: {} as PackMachineInput,
    context: {} as PackMachineContext,
    output: {} as PackMachineOutput,
    events: {} as PackMachineEvents,
  },
  actions: {
    spawnPackActors: enqueueActions(
      ({enqueue, context: {pkgManager, workspaceInfo, parentRef}}) => {
        workspaceInfo.forEach(({pkgName, localPath}, index) => {
          const id = `PackActor.${pkgName}.${makeId()}`;
          enqueue.sendTo(parentRef, {
            type: 'PKG_BACK_BEGIN',
            pkgManager,
            localPath,
            currentPkg: index,
          });

          enqueue.spawnChild('pack', {
            id,
            input: {
              localPath,
              pkgManager,
              // TODO: fix
              signal: new AbortController().signal,
              index: index + 1,
            },
          });
        });
      },
    ),

    // assign({
    //   packActorRefs: ({
    //     ,
    //     spawn,
    //   }) => {
    //     return {
    //       ...packActorRefs,
    //       ...Object.fromEntries(
    //         Object.entries(workspaceInfo).map(([pkgName, localPath], index) => {
    //           const id = `PackActor.${pkgName}.${makeId()}`;
    //           const actorRef = spawn('pack', {
    //             id,
    //             input: {
    //               localPath,
    //               pkgManager,
    //               // TODO: fix
    //               signal: new AbortController().signal,
    //               index: index + 1,
    //             },
    //           });
    //           return [id, actorRef];
    //         }),
    //       ),
    //     };
    //   },
    // }),
    sendPkgManagerPackBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): PackerMachinePkgManagerPackBeginEvent => {
        const {pkgManager, index} = context;
        return {
          type: 'PKG_MANAGER_PACK_BEGIN',
          pkgManager,
          index,
        };
      },
    ),
  },
  actors: {
    pack,
  },
}).createMachine({
  context: ({input}) => input,
  entry: [log(({context}) => `Packing for ${context.pkgManager.spec}`)],
  initial: 'packing',
  states: {
    packing: {
      entry: [{type: 'sendPkgManagerPackBegin'}, {type: 'spawnPackActors'}],
      on: {
        'xstate.done.actor.PackActor.*': [
          {
            guard: ({event: {output}}) => output.type === 'ERROR',
            actions: [
              log('sending PKG_PACK_FAILED'),
              assign({
                error: ({event: {output}}) => {
                  assertActorOutputNotOk(output);
                  return output.error;
                },
              }),
              sendTo(
                ({context: {parentRef}}) => parentRef,
                ({
                  context,
                  event: {output},
                }): PackerMachinePkgPackFailedEvent => {
                  assertActorOutputNotOk(output);
                  return {
                    type: 'PKG_PACK_FAILED',
                    localPath: output.localPath,
                    error: output.error,
                    pkgManager: context.pkgManager,
                    currentPkg: output.index,
                  };
                },
              ),
            ],
          },
          {
            guard: ({event: {output}}) => output.type === 'OK',
            actions: [
              log('sending PKG_PACK_OK'),
              assign({
                installManifests: ({
                  context: {installManifests = []},
                  event,
                }) => {
                  assertActorOutputOk(event.output);
                  return [...installManifests, event.output.installManifest];
                },
              }),
              sendTo(
                ({context: {parentRef}}) => parentRef,
                ({
                  context: {pkgManager},
                  event: {output},
                }): PackerMachinePkgPackOkEvent => {
                  assertActorOutputOk(output);
                  const {installManifest, index: currentPkg} = output;
                  return {
                    installManifest,
                    type: 'PKG_PACK_OK',
                    pkgManager,
                    currentPkg,
                  };
                },
              ),
            ],
          },
        ],
      },
      always: [
        {
          guard: ({context: {workspaceInfo, installManifests = []}}) =>
            installManifests.length === workspaceInfo.length,
          target: 'done',
        },
      ],
    },
    done: {
      type: 'final',
    },
  },
  output: ({
    self: {id},
    context: {pkgManager, installManifests = [], error, index, workspaceInfo},
  }) =>
    error
      ? {type: 'ERROR', error, id, pkgManager, index, workspaceInfo}
      : {type: 'OK', installManifests, id, pkgManager, index, workspaceInfo},
});
