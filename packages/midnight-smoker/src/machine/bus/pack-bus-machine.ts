import {FINAL} from '#constants';
import {PackEvents} from '#constants/event';
import {PackError} from '#error/pack-error';
import {PackParseError} from '#error/pack-parse-error';
import {type DataForEvent} from '#event/events';
import {type PackEventData} from '#event/pack-events';
import {type ListenEvent} from '#machine/bus';
import {type ReporterMachine} from '#machine/reporter';
import {type SmokerOptions} from '#schema/smoker-options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {assertSmokerError, fromUnknownError} from '#util/error-util';
import {asResult} from '#util/result';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type CtrlPackEvents} from '../event/pack';

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
          }): DataForEvent<typeof PackEvents.PackBegin> => ({
            type: PackEvents.PackBegin,
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
              }): DataForEvent<typeof PackEvents.PkgPackBegin> => ({
                totalPkgs,
                ...event,
                type: PackEvents.PkgPackBegin,
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
              }): DataForEvent<typeof PackEvents.PkgPackOk> => ({
                totalPkgs,
                ...event,
                type: PackEvents.PkgPackOk,
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
              }): DataForEvent<typeof PackEvents.PkgPackFailed> => {
                return {
                  ...event,
                  type: PackEvents.PkgPackFailed,
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
              }): DataForEvent<typeof PackEvents.PkgManagerPackBegin> => ({
                type: PackEvents.PkgManagerPackBegin,
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
              }): DataForEvent<typeof PackEvents.PkgManagerPackOk> => ({
                type: PackEvents.PkgManagerPackOk,
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
              }): DataForEvent<typeof PackEvents.PkgManagerPackFailed> => ({
                type: PackEvents.PkgManagerPackFailed,
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
          }): DataForEvent<
            typeof PackEvents.PackFailed | typeof PackEvents.PackOk
          > => {
            if (error) {
              assertSmokerError([PackError, PackParseError], error);
            }
            return error
              ? {
                  error,
                  type: PackEvents.PackFailed,
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
                  type: PackEvents.PackOk,
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
