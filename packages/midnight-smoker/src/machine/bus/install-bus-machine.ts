import {FINAL, InstallEvents} from '#constants';
import {type InstallError} from '#error/install-error';
import {type EventData} from '#event/events';
import {type InstallEventData} from '#event/install-events';
import {type SmokeMachineInstallEvent} from '#machine/event/install';
import {type SmokerOptions} from '#schema/smoker-options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {fromUnknownError} from '#util/from-unknown-error';
import {asResult, type Result} from '#util/result';
import {type AnyActorRef, assign, enqueueActions, setup} from 'xstate';

import {type ListenEvent} from './common-event';

/**
 * Input for {@link InstallBusMachine}
 */
export interface InstallBusMachineInput {
  parentRef: AnyActorRef;
  pkgManagers: StaticPkgManagerSpec[];
  smokerOptions: SmokerOptions;
  workspaceInfo: WorkspaceInfo[];
}

/**
 * Context for {@link InstallBusMachine}
 */
export interface InstallBusMachineContext extends InstallBusMachineInput {
  actorIds?: string[];
  error?: Error;
  pkgManagerDidInstallCount: number;
  totalPkgs: number;
  workspaceInfoResult: Result<WorkspaceInfo>[];
}

export type InstallBusMachineEvents = ListenEvent | SmokeMachineInstallEvent;

export type ReportableInstallEventData = EventData<keyof InstallEventData>;

export const InstallBusMachine = setup({
  actions: {
    assignActorIds: assign({actorIds: (_, actorIds: string[]) => actorIds}),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
    incrementInstallCount: assign({
      pkgManagerDidInstallCount: ({context: {pkgManagerDidInstallCount}}) => {
        return pkgManagerDidInstallCount + 1;
      },
    }),
    report: enqueueActions(
      (
        {context: {actorIds = [], parentRef}, enqueue},
        params:
          | {andParent: true; event: ReportableInstallEventData}
          | ReportableInstallEventData,
      ) => {
        let event: ReportableInstallEventData;
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
  },
  guards: {
    hasError: ({context: {error}}) => !!error,
    isInstallingComplete: ({
      context: {pkgManagerDidInstallCount, pkgManagers = []},
    }) => pkgManagerDidInstallCount === pkgManagers.length,
  },
  types: {
    context: {} as InstallBusMachineContext,
    events: {} as InstallBusMachineEvents,
    input: {} as InstallBusMachineInput,
  },
}).createMachine({
  context: ({input}) => ({
    ...input,
    pkgManagerDidInstallCount: 0,
    totalPkgs: input.workspaceInfo.length + input.smokerOptions.add.length,
    workspaceInfoResult: input.workspaceInfo.map(asResult),
  }),
  id: 'InstallBusMachine',
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
          actions: {
            params: ({event: {actorIds}}) => actorIds,
            type: 'assignActorIds',
          },
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
          guard: 'isInstallingComplete',
          target: 'done',
        },
      ],
      entry: [
        {
          params: ({
            context: {
              pkgManagers = [],
              smokerOptions: {add = []},
              totalPkgs,
              workspaceInfo,
            },
          }): {
            andParent: true;
            event: EventData<typeof InstallEvents.InstallBegin>;
          } => {
            const additionalDeps = [...add];
            return {
              andParent: true,
              event: {
                additionalDeps,
                pkgManagers,
                totalPkgs,
                type: InstallEvents.InstallBegin,
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
              pkgManagers,
              smokerOptions: {add},
              totalPkgs,
              workspaceInfo,
            },
          }): {
            andParent: true;
            event: EventData<
              | typeof InstallEvents.InstallFailed
              | typeof InstallEvents.InstallOk
            >;
          } =>
            error
              ? {
                  andParent: true,
                  event: {
                    additionalDeps: [...add],
                    error: error as InstallError,
                    pkgManagers,
                    totalPkgs,
                    type: InstallEvents.InstallFailed,
                    workspaceInfo,
                  },
                }
              : {
                  andParent: true,
                  event: {
                    additionalDeps: [...add],
                    pkgManagers,
                    totalPkgs,
                    type: InstallEvents.InstallOk,
                    workspaceInfo,
                  },
                },
          type: 'report',
        },
      ],
      on: {
        [InstallEvents.PkgInstallBegin]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  totalPkgs,
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof InstallEvents.PkgInstallBegin> => ({
                totalPkgManagers,
                totalPkgs,
                workspaceInfo,
                ...event,
                type: InstallEvents.PkgInstallBegin,
              }),
              type: 'report',
            },
          ],
        },
        [InstallEvents.PkgInstallFailed]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  totalPkgs,
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof InstallEvents.PkgInstallFailed> => {
                return {
                  totalPkgManagers,
                  workspaceInfo,
                  ...event,
                  totalPkgs,
                  type: InstallEvents.PkgInstallFailed,
                };
              },
              type: 'report',
            },
            // TODO: abort
          ],
        },
        [InstallEvents.PkgInstallOk]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  totalPkgs,
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof InstallEvents.PkgInstallOk> => ({
                totalPkgManagers,
                totalPkgs,
                workspaceInfo,
                ...event,
                type: InstallEvents.PkgInstallOk,
              }),
              type: 'report',
            },
          ],
        },
        [InstallEvents.PkgManagerInstallBegin]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers = [],
                  totalPkgs,
                  workspaceInfoResult: workspaceInfo,
                },
                event: {manifests, pkgManager},
              }): EventData<typeof InstallEvents.PkgManagerInstallBegin> => ({
                manifests,
                pkgManager,
                totalPkgManagers: pkgManagers.length,
                totalPkgs,
                type: InstallEvents.PkgManagerInstallBegin,
                workspaceInfo,
              }),
              type: 'report',
            },
          ],
        },
        [InstallEvents.PkgManagerInstallFailed]: {
          actions: [
            assign({
              pkgManagerDidInstallCount: ({
                context: {pkgManagerDidInstallCount},
              }) => {
                return pkgManagerDidInstallCount + 1;
              },
            }),
            {
              params: ({
                context: {
                  pkgManagers = [],
                  totalPkgs,
                  workspaceInfoResult: workspaceInfo,
                },
                event: {error, manifests, pkgManager},
              }): EventData<typeof InstallEvents.PkgManagerInstallFailed> => ({
                error,
                manifests,
                pkgManager,
                totalPkgManagers: pkgManagers.length,
                totalPkgs,
                type: InstallEvents.PkgManagerInstallFailed,
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
        [InstallEvents.PkgManagerInstallOk]: {
          actions: [
            assign({
              pkgManagerDidInstallCount: ({
                context: {pkgManagerDidInstallCount},
              }) => {
                return pkgManagerDidInstallCount + 1;
              },
            }),
            {
              params: ({
                context: {
                  pkgManagers = [],
                  totalPkgs,
                  workspaceInfoResult: workspaceInfo,
                },
                event: {manifests, pkgManager},
              }): EventData<typeof InstallEvents.PkgManagerInstallOk> => ({
                manifests,
                pkgManager,
                totalPkgManagers: pkgManagers.length,
                totalPkgs,
                type: InstallEvents.PkgManagerInstallOk,
                workspaceInfo,
              }),
              type: 'report',
            },
          ],
        },
      },
    },
  },
  systemId: 'InstallBusMachine',
});
