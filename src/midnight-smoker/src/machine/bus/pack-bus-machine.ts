import {FINAL} from '#constants';
import {PackEvents} from '#constants/event';
import {PackError} from '#error/pack-error';
import {PackParseError} from '#error/pack-parse-error';
import {type EventData} from '#event/events';
import {type PackEventData} from '#event/pack-events';
import {type SmokerOptions} from '#schema/smoker-options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {assertSmokerError, fromUnknownError} from '#util/error-util';
import {asResult, type Result} from '#util/result';
import {type AnyActorRef, assign, enqueueActions, sendTo, setup} from 'xstate';

import {type SmokeMachinePackEvent} from '../event/pack.js';
import {type ListenEvent} from './common-event.js';

export interface PackBusMachineInput {
  parentRef: AnyActorRef;
  pkgManagers: StaticPkgManagerSpec[];
  smokerOptions: SmokerOptions;
  workspaceInfo: WorkspaceInfo[];
}

export interface PackBusMachineContext extends PackBusMachineInput {
  actorIds?: string[];
  error?: Error;
  pkgManagerDidPackCount: number;
  workspaceInfoResult: Result<WorkspaceInfo>[];
}

export type PackBusMachineEvents = ListenEvent | SmokeMachinePackEvent;

export type ReportablePackEventData = EventData<keyof PackEventData>;

export const PackBusMachine = setup({
  actions: {
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
    report: enqueueActions(
      (
        {context: {actorIds = [], parentRef}, enqueue},
        params:
          | {andParent: true; event: ReportablePackEventData}
          | ReportablePackEventData,
      ) => {
        let event: ReportablePackEventData;
        let andParent = false;
        if ('andParent' in params) {
          ({andParent, event} = params);
        } else {
          event = params;
        }
        for (const id of actorIds) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          enqueue.sendTo<AnyActorRef>(({system}) => system.get(id), {
            event,
            type: 'EVENT',
          });
        }
        if (andParent) {
          enqueue.sendTo(parentRef, event);
        }
      },
    ),
    sendToParent: sendTo(
      ({context}) => context.parentRef,
      (_, event) => event,
    ),
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    isPackingComplete: ({
      context: {pkgManagerDidPackCount, pkgManagers = []},
    }) => {
      return pkgManagerDidPackCount === pkgManagers.length;
    },
  },
  types: {
    context: {} as PackBusMachineContext,
    events: {} as PackBusMachineEvents,
    input: {} as PackBusMachineInput,
  },
}).createMachine({
  context: ({input}) => ({
    ...input,
    pkgManagerDidPackCount: 0,
    workspaceInfoResult: input.workspaceInfo.map(asResult),
  }),
  id: 'PackBusMachine',
  initial: 'idle',
  states: {
    done: {
      type: FINAL,
    },
    errored: {
      type: FINAL,
    },
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
      entry: [
        {
          params: ({
            context: {
              pkgManagers = [],
              smokerOptions: {all: allWorkspaces, cwd, workspace},
              workspaceInfo,
            },
          }): {
            andParent: true;
            event: EventData<typeof PackEvents.PackBegin>;
          } => {
            const workspaces = [...workspace];
            return {
              andParent: true,
              event: {
                packOptions: {
                  allWorkspaces,
                  cwd,
                  workspaces,
                },
                pkgManagers,
                type: PackEvents.PackBegin,
                workspaceInfo,
              },
            };
          },
          type: 'report',
        },
      ],
      exit: [
        {
          params: ({
            context: {
              error,
              pkgManagers = [],
              smokerOptions: {all: allWorkspaces, cwd, workspace: workspaces},
              workspaceInfo,
            },
          }): {
            andParent: true;
            event: EventData<
              typeof PackEvents.PackFailed | typeof PackEvents.PackOk
            >;
          } => {
            if (error) {
              assertSmokerError([PackError, PackParseError], error);
            }
            return error
              ? {
                  andParent: true,
                  event: {
                    error,
                    packOptions: {
                      allWorkspaces,
                      cwd,
                      // includeWorkspaceRoot,
                      workspaces: [...workspaces],
                    },
                    pkgManagers,
                    type: PackEvents.PackFailed,
                    workspaceInfo,
                  },
                }
              : {
                  andParent: true,
                  event: {
                    packOptions: {
                      allWorkspaces,
                      cwd,
                      // includeWorkspaceRoot,
                      workspaces: [...workspaces],
                    },
                    pkgManagers,
                    type: PackEvents.PackOk,
                    workspaceInfo,
                  },
                };
          },
          type: 'report',
        },
      ],
      on: {
        [PackEvents.PkgManagerPackBegin]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {
                    all: allWorkspaces,
                    cwd,
                    workspace: workspaces,
                  },
                  workspaceInfo,
                },
                event: {pkgManager},
              }): EventData<typeof PackEvents.PkgManagerPackBegin> => ({
                packOptions: {
                  allWorkspaces,
                  cwd,
                  // includeWorkspaceRoot,
                  workspaces: [...workspaces],
                },
                pkgManager,
                totalPkgManagers: pkgManagers.length,
                type: PackEvents.PkgManagerPackBegin,
                workspaceInfo: workspaceInfo.map(asResult),
              }),
              type: 'report',
            },
          ],
        },
        [PackEvents.PkgManagerPackFailed]: {
          actions: [
            assign({
              pkgManagerDidPackCount: ({context: {pkgManagerDidPackCount}}) => {
                return pkgManagerDidPackCount + 1;
              },
            }),
            {
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {
                    all: allWorkspaces,
                    cwd,
                    workspace: workspaces,
                  },
                  workspaceInfo,
                },
                event: {error, pkgManager},
              }): EventData<typeof PackEvents.PkgManagerPackFailed> => ({
                error,
                packOptions: {
                  allWorkspaces,
                  cwd,
                  // includeWorkspaceRoot,
                  workspaces: [...workspaces],
                },
                pkgManager,
                totalPkgManagers: pkgManagers.length,
                type: PackEvents.PkgManagerPackFailed,
                workspaceInfo,
              }),
              type: 'report',
            },
            {
              params: ({event: {error}}) => ({error}),
              type: 'assignError',
            },
          ],
        },
        [PackEvents.PkgManagerPackOk]: {
          actions: [
            assign({
              pkgManagerDidPackCount: ({context: {pkgManagerDidPackCount}}) => {
                return pkgManagerDidPackCount + 1;
              },
            }),
            {
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {
                    all: allWorkspaces,
                    cwd,
                    workspace: workspaces,
                  },
                  workspaceInfo,
                },
                event: {manifests, pkgManager},
              }): EventData<typeof PackEvents.PkgManagerPackOk> => ({
                manifests,
                packOptions: {
                  allWorkspaces,
                  cwd,
                  // includeWorkspaceRoot,
                  workspaces: [...workspaces],
                },
                pkgManager,
                totalPkgManagers: pkgManagers.length,
                type: PackEvents.PkgManagerPackOk,
                workspaceInfo,
              }),
              type: 'report',
            },
          ],
        },
        [PackEvents.PkgPackBegin]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  workspaceInfo: {length: totalPkgs},
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof PackEvents.PkgPackBegin> => ({
                totalPkgManagers,
                totalPkgs,
                workspaceInfo,
                ...event,
                type: PackEvents.PkgPackBegin,
              }),
              type: 'report',
            },
          ],
        },
        [PackEvents.PkgPackFailed]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  workspaceInfo: {length: totalPkgs},
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof PackEvents.PkgPackFailed> => {
                return {
                  totalPkgManagers,
                  totalPkgs,
                  workspaceInfo,
                  ...event,
                  type: PackEvents.PkgPackFailed,
                };
              },
              type: 'report',
            },
          ],
        },
        [PackEvents.PkgPackOk]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  workspaceInfo: {length: totalPkgs},
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof PackEvents.PkgPackOk> => ({
                totalPkgManagers,
                totalPkgs,
                workspaceInfo,
                ...event,
                type: PackEvents.PkgPackOk,
              }),
              type: 'report',
            },
          ],
        },
      },
    },
  },
  systemId: 'PackBusMachine',
});
