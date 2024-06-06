import {FINAL} from '#constants';
import {fromUnknownError} from '#error/from-unknown-error';
import {type PackError, type PackParseError} from '#error/pack-error';
import {SmokerEvent} from '#event/event-constants';
import {type DataForEvent} from '#event/events';
import {type PackEventData} from '#event/pack-events';
import {type ReporterMachine} from '#machine/reporter';
import {type SmokerOptions} from '#options/options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {asResult} from '#util/util';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type ListenEvent} from '.';
import {type CtrlPackEvents} from './pack-events';

export interface PackBusMachineInput {
  workspaceInfo: WorkspaceInfo[];
  smokerOptions: SmokerOptions;
  pkgManagers: StaticPkgManagerSpec[];
  parentRef: AnyActorRef;
}

export interface PackBusMachineContext extends PackBusMachineInput {
  actorIds?: string[];
  pkgManagerDidPackCount: number;
  error?: Error;
}

export type PackBusMachineEvents = ListenEvent | CtrlPackEvents;

export type ReportablePackEventData = DataForEvent<keyof PackEventData>;

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
        {enqueue, context: {actorIds = [], parentRef}},
        event: ReportablePackEventData,
      ) => {
        for (const id of actorIds) {
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
        LISTEN: {
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
            context: {pkgManagers = [], workspaceInfo, smokerOptions},
          }): DataForEvent<typeof SmokerEvent.PackBegin> => ({
            type: SmokerEvent.PackBegin,
            packOptions: {
              cwd: smokerOptions.cwd,
              allWorkspaces: smokerOptions.all,
              workspaces: smokerOptions.workspace,
            },
            pkgManagers,
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
              }): DataForEvent<typeof SmokerEvent.PkgPackBegin> => ({
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
              }): DataForEvent<typeof SmokerEvent.PkgPackOk> => ({
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
              }): DataForEvent<typeof SmokerEvent.PkgPackFailed> => {
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
              }): DataForEvent<typeof SmokerEvent.PkgManagerPackBegin> => ({
                type: SmokerEvent.PkgManagerPackBegin,
                pkgManager,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  // includeWorkspaceRoot,
                  workspaces,
                },
                totalPkgManagers: pkgManagers.length,
                workspaceInfo: workspaceInfo.map(asResult),
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
              }): DataForEvent<typeof SmokerEvent.PkgManagerPackOk> => ({
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
              }): DataForEvent<typeof SmokerEvent.PkgManagerPackFailed> => ({
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
              pkgManagers = [],
              workspaceInfo,
              error,
            },
          }):
            | DataForEvent<typeof SmokerEvent.PackFailed>
            | DataForEvent<typeof SmokerEvent.PackOk> => {
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
                  workspaceInfo,
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
