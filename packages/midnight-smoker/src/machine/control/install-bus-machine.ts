import {fromUnknownError} from '#error/from-unknown-error';
import {type InstallError} from '#error/install-error';
import {SmokerEvent} from '#event/event-constants';
import {type DataForEvent} from '#event/events';
import {type InstallEventData} from '#event/install-events';
import {type ReporterMachine} from '#machine/reporter';
import {FINAL} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type CtrlInstallEvents} from './install-events';

export interface InstallBusMachineInput {
  workspaceInfo: WorkspaceInfo[];
  smokerOptions: SmokerOptions;
  pkgManagers: StaticPkgManagerSpec[];
  uniquePkgNames: string[];
  parentRef: AnyActorRef;
}

export interface InstallBusMachineContext extends InstallBusMachineInput {
  actorIds?: string[];
  pkgManagerDidInstallCount: number;
  error?: Error;
}

export interface InstallBusMachineInstallEvent {
  type: 'INSTALL';
  actorIds: string[];
}

export type InstallBusMachineEvents =
  | InstallBusMachineInstallEvent
  | CtrlInstallEvents;

export type ReportableInstallEventData = DataForEvent<keyof InstallEventData>;

export const InstallBusMachine = setup({
  types: {
    input: {} as InstallBusMachineInput,
    context: {} as InstallBusMachineContext,
    events: {} as InstallBusMachineEvents,
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    isInstallingComplete: ({
      context: {pkgManagerDidInstallCount, pkgManagers = []},
    }) => {
      return pkgManagerDidInstallCount === pkgManagers.length;
    },
  },
  actions: {
    report: enqueueActions(
      (
        {enqueue, context: {actorIds: machines = [], parentRef}},
        event: ReportableInstallEventData,
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
    incrementInstallCount: assign({
      pkgManagerDidInstallCount: ({context: {pkgManagerDidInstallCount}}) => {
        return pkgManagerDidInstallCount + 1;
      },
    }),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
  },
}).createMachine({
  id: 'InstallBusMachine',
  systemId: 'InstallBusMachine',
  context: ({input}) => ({...input, pkgManagerDidInstallCount: 0}),
  initial: 'idle',
  states: {
    idle: {
      on: {
        INSTALL: {
          actions: [assign({actorIds: ({event: {actorIds}}) => actorIds})],
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
              smokerOptions: {add: additionalDeps = []},
              pkgManagers = [],
              uniquePkgNames: uniquePkgs = [],
              workspaceInfo,
            },
          }): DataForEvent<typeof SmokerEvent.InstallBegin> => {
            return {
              type: SmokerEvent.InstallBegin,
              uniquePkgs,
              pkgManagers,
              additionalDeps,
              totalPkgs: pkgManagers.length * workspaceInfo.length,
            };
          },
        },
      ],
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
      on: {
        'INSTALL.PKG_INSTALL_BEGIN': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  workspaceInfo: {length: totalPkgs},
                },
                event,
              }): DataForEvent<typeof SmokerEvent.PkgInstallBegin> => ({
                totalPkgs,
                ...event,
                type: SmokerEvent.PkgInstallBegin,
              }),
            },
          ],
        },
        'INSTALL.PKG_INSTALL_OK': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  workspaceInfo: {length: totalPkgs},
                },
                event,
              }): DataForEvent<typeof SmokerEvent.PkgInstallOk> => ({
                totalPkgs,
                ...event,
                type: SmokerEvent.PkgInstallOk,
              }),
            },
          ],
        },
        'INSTALL.PKG_INSTALL_FAILED': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  workspaceInfo: {length: totalPkgs},
                },
                event,
              }): DataForEvent<typeof SmokerEvent.PkgInstallFailed> => {
                return {
                  ...event,
                  type: SmokerEvent.PkgInstallFailed,
                  totalPkgs,
                };
              },
            },
            // TODO: abort
          ],
        },
        'INSTALL.PKG_MANAGER_INSTALL_BEGIN': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers = []},
                event: {pkgManager, manifests},
              }): DataForEvent<typeof SmokerEvent.PkgManagerInstallBegin> => ({
                type: SmokerEvent.PkgManagerInstallBegin,
                pkgManager,
                manifests,
                totalPkgs: manifests.length, // TODO is this right?
                totalPkgManagers: pkgManagers.length,
              }),
            },
          ],
        },
        'INSTALL.PKG_MANAGER_INSTALL_OK': {
          actions: [
            assign({
              pkgManagerDidInstallCount: ({
                context: {pkgManagerDidInstallCount},
              }) => {
                return pkgManagerDidInstallCount + 1;
              },
            }),
            {
              type: 'report',
              params: ({
                context: {pkgManagers = []},
                event: {pkgManager, manifests},
              }): DataForEvent<typeof SmokerEvent.PkgManagerInstallOk> => ({
                type: SmokerEvent.PkgManagerInstallOk,
                manifests,
                pkgManager,
                totalPkgs: manifests.length,
                totalPkgManagers: pkgManagers.length,
              }),
            },
          ],
        },
        'INSTALL.PKG_MANAGER_INSTALL_FAILED': {
          actions: [
            assign({
              pkgManagerDidInstallCount: ({
                context: {pkgManagerDidInstallCount},
              }) => {
                return pkgManagerDidInstallCount + 1;
              },
            }),
            {
              type: 'report',
              params: ({
                context: {pkgManagers = []},
                event: {pkgManager, manifests, error},
              }): DataForEvent<typeof SmokerEvent.PkgManagerInstallFailed> => ({
                type: SmokerEvent.PkgManagerInstallFailed,
                manifests,
                pkgManager,
                error,
                totalPkgs: manifests.length,
                totalPkgManagers: pkgManagers.length,
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
              smokerOptions: {add: additionalDeps},
              uniquePkgNames: uniquePkgs,
              pkgManagers,
              workspaceInfo,
              error,
            },
          }):
            | DataForEvent<typeof SmokerEvent.InstallFailed>
            | DataForEvent<typeof SmokerEvent.InstallOk> => {
            const totalPkgs = pkgManagers.length * workspaceInfo.length;
            return error
              ? {
                  error: error as InstallError,
                  type: SmokerEvent.InstallFailed,
                  pkgManagers,
                  uniquePkgs,
                  additionalDeps,
                  totalPkgs,
                }
              : {
                  type: SmokerEvent.InstallOk,
                  pkgManagers,
                  additionalDeps,
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
