import {fromUnknownError, type PackError, type PackParseError} from '#error';
import {SmokerEvent, type EventData} from '#event';
import {type ReporterMachine} from '#machine/reporter';
import {FINAL} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type StaticPkgManagerSpec, type WorkspaceInfo} from '#schema';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type ControlMachineEmitted} from './control-machine-events';
import {
  type CtrlPkgManagerPackBeginEvent,
  type CtrlPkgManagerPackFailedEvent,
  type CtrlPkgManagerPackOkEvent,
  type CtrlPkgPackBeginEvent,
  type CtrlPkgPackFailedEvent,
  type CtrlPkgPackOkEvent,
} from './pack-events';

export interface PackBusMachineInput {
  workspaceInfo: WorkspaceInfo[];
  smokerOptions: SmokerOptions;
  pkgManagers: StaticPkgManagerSpec[];
  uniquePkgNames: string[];
  parentRef: AnyActorRef;
}

export interface PackBusMachineContext extends PackBusMachineInput {
  actorIds?: string[];
  pkgManagerDidPackCount: number;
  error?: Error;
}

export interface PackBusMachinePackEvent {
  type: 'PACK';
  actorIds: string[];
}

export type PackBusMachineEvents =
  | PackBusMachinePackEvent
  | CtrlPkgPackBeginEvent
  | CtrlPkgPackOkEvent
  | CtrlPkgPackFailedEvent
  | CtrlPkgManagerPackBeginEvent
  | CtrlPkgManagerPackOkEvent
  | CtrlPkgManagerPackFailedEvent;

export const PackBusMachine = setup({
  types: {
    input: {} as PackBusMachineInput,
    context: {} as PackBusMachineContext,
    events: {} as PackBusMachineEvents,
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    isPackingComplete: ({
      context: {pkgManagerDidPackCount, pkgManagers = []},
    }) => {
      return pkgManagerDidPackCount === pkgManagers.length;
    },
  },
  actions: {
    report: enqueueActions(
      (
        {enqueue, context: {actorIds: machines = [], parentRef}},
        event: ControlMachineEmitted,
      ) => {
        for (const id of machines) {
          enqueue.sendTo(
            ({system}) =>
              system.get(id) as ActorRefFrom<typeof ReporterMachine>,
            {type: 'EVENT', event},
          );
        }
        enqueue.sendTo(parentRef, event);
      },
    ),
    incrementPackCount: assign({
      pkgManagerDidPackCount: ({context: {pkgManagerDidPackCount}}) => {
        return pkgManagerDidPackCount + 1;
      },
    }),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
  },
}).createMachine({
  id: 'PackBusMachine',
  systemId: 'PackBusMachine',
  context: ({input}) => ({...input, pkgManagerDidPackCount: 0}),
  initial: 'idle',
  states: {
    idle: {
      on: {
        PACK: {
          actions: [
            assign({actorIds: ({event: {actorIds: machines}}) => machines}),
          ],
          target: 'working',
        },
      },
    },
    working: {
      entry: [
        {
          type: 'report',
          params: ({
            context: {
              pkgManagers = [],
              workspaceInfo,
              smokerOptions,
              uniquePkgNames: uniquePkgs = [],
            },
          }): EventData<typeof SmokerEvent.PackBegin> => ({
            type: SmokerEvent.PackBegin,
            packOptions: {
              cwd: smokerOptions.cwd,
              allWorkspaces: smokerOptions.all,
              workspaces: smokerOptions.workspace,
            },
            pkgManagers,
            totalPkgs: workspaceInfo.length * pkgManagers.length,
            uniquePkgs,
            workspaceInfo,
          }),
        },
      ],
      always: [
        {
          guard: 'hasError',
          target: 'errored',
        },
        {
          guard: 'isPackingComplete',
          target: 'done',
        },
      ],
      on: {
        'PACK.PKG_PACK_BEGIN': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  workspaceInfo: {length: totalPkgs},
                },
                event,
              }): EventData<typeof SmokerEvent.PkgPackBegin> => ({
                totalPkgs,
                ...event,
                type: SmokerEvent.PkgPackBegin,
              }),
            },
          ],
        },
        'PACK.PKG_PACK_OK': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  workspaceInfo: {length: totalPkgs},
                },
                event,
              }): EventData<typeof SmokerEvent.PkgPackOk> => ({
                totalPkgs,
                ...event,
                type: SmokerEvent.PkgPackOk,
              }),
            },
          ],
        },
        'PACK.PKG_PACK_FAILED': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  workspaceInfo: {length: totalPkgs},
                },
                event,
              }): EventData<typeof SmokerEvent.PkgPackFailed> => {
                return {
                  ...event,
                  type: SmokerEvent.PkgPackFailed,
                  totalPkgs,
                };
              },
            },
            // TODO: abort
          ],
        },
        'PACK.PKG_MANAGER_PACK_BEGIN': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    workspace: workspaces,
                  },
                  workspaceInfo,
                },
                event: {pkgManager},
              }): EventData<typeof SmokerEvent.PkgManagerPackBegin> => ({
                type: SmokerEvent.PkgManagerPackBegin,
                pkgManager,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  // includeWorkspaceRoot,
                  workspaces,
                },
                totalPkgManagers: pkgManagers.length,
                workspaceInfo,
              }),
            },
          ],
        },
        'PACK.PKG_MANAGER_PACK_OK': {
          actions: [
            assign({
              pkgManagerDidPackCount: ({context: {pkgManagerDidPackCount}}) => {
                return pkgManagerDidPackCount + 1;
              },
            }),
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    workspace: workspaces,
                  },
                },
                event: {pkgManager, manifests, workspaceInfo},
              }): EventData<typeof SmokerEvent.PkgManagerPackOk> => ({
                type: SmokerEvent.PkgManagerPackOk,
                pkgManager,
                packOptions: {
                  allWorkspaces,
                  cwd,
                  // includeWorkspaceRoot,
                  workspaces,
                },
                manifests,
                totalPkgManagers: pkgManagers.length,
                workspaceInfo,
              }),
            },
          ],
        },
        'PACK.PKG_MANAGER_PACK_FAILED': {
          actions: [
            assign({
              pkgManagerDidPackCount: ({context: {pkgManagerDidPackCount}}) => {
                return pkgManagerDidPackCount + 1;
              },
            }),
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    workspace: workspaces,
                  },
                },
                event: {pkgManager, error, workspaceInfo},
              }): EventData<typeof SmokerEvent.PkgManagerPackFailed> => ({
                type: SmokerEvent.PkgManagerPackFailed,
                pkgManager,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  // includeWorkspaceRoot,
                  workspaces,
                },
                error,
                totalPkgManagers: pkgManagers.length,
                workspaceInfo,
              }),
            },
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
          ],
        },
      },
      exit: [
        {
          type: 'report',
          params: ({
            context: {
              smokerOptions: {cwd, all: allWorkspaces, workspace: workspaces},
              uniquePkgNames: uniquePkgs = [],
              pkgManagers = [],
              workspaceInfo,
              error,
            },
          }):
            | EventData<typeof SmokerEvent.PackFailed>
            | EventData<typeof SmokerEvent.PackOk> => {
            const totalPkgs = pkgManagers.length * workspaceInfo.length;
            return error
              ? {
                  error: error as PackError | PackParseError,
                  type: SmokerEvent.PackFailed,
                  packOptions: {
                    cwd,
                    allWorkspaces,
                    // includeWorkspaceRoot,
                    workspaces,
                  },
                  pkgManagers,
                  uniquePkgs,
                  workspaceInfo,
                  totalPkgs,
                }
              : {
                  type: SmokerEvent.PackOk,
                  packOptions: {
                    cwd,
                    allWorkspaces,
                    // includeWorkspaceRoot,
                    workspaces,
                  },
                  pkgManagers,
                  workspaceInfo,
                  uniquePkgs,
                  totalPkgs,
                };
          },
        },
      ],
    },
    done: {
      type: FINAL,
    },
    errored: {
      type: FINAL,
    },
  },
});
