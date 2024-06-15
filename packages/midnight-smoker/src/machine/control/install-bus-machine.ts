import {FINAL} from '#constants';
import {type InstallError} from '#error/install-error';
import {SmokerEvent} from '#event/event-constants';
import {type DataForEvent} from '#event/events';
import {type InstallEventData} from '#event/install-events';
import {type ReporterMachine} from '#machine/reporter';
import {type SmokerOptions} from '#options/options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {fromUnknownError} from '#util/error-util';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type ListenEvent} from '.';
import {type CtrlInstallEvent} from './install-events';

export interface InstallBusMachineInput {
  workspaceInfo: WorkspaceInfo[];
  smokerOptions: SmokerOptions;
  pkgManagers: StaticPkgManagerSpec[];
  parentRef: AnyActorRef;
}

export interface InstallBusMachineContext extends InstallBusMachineInput {
  actorIds?: string[];
  pkgManagerDidInstallCount: number;
  totalPkgs: number;
  error?: Error;
}

export type InstallBusMachineEvents = ListenEvent | CtrlInstallEvent;

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
    }) => pkgManagerDidInstallCount === pkgManagers.length,
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
  context: ({input}) => ({
    ...input,
    pkgManagerDidInstallCount: 0,
    totalPkgs: input.workspaceInfo.length + input.smokerOptions.add.length,
  }),
  initial: 'idle',
  states: {
    idle: {
      on: {
        LISTEN: {
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
              totalPkgs,
              workspaceInfo,
            },
          }): DataForEvent<typeof SmokerEvent.InstallBegin> => {
            return {
              type: SmokerEvent.InstallBegin,
              pkgManagers,
              workspaceInfo,
              additionalDeps,
              totalPkgs,
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
                context: {totalPkgs},
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
                context: {totalPkgs},
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
                context: {totalPkgs},
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
                context: {pkgManagers = [], totalPkgs},
                event: {pkgManager, manifests, workspaceInfo},
              }): DataForEvent<typeof SmokerEvent.PkgManagerInstallBegin> => ({
                type: SmokerEvent.PkgManagerInstallBegin,
                workspaceInfo,
                pkgManager,
                manifests,
                totalPkgs,
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
                context: {pkgManagers = [], totalPkgs},
                event: {pkgManager, manifests, workspaceInfo},
              }): DataForEvent<typeof SmokerEvent.PkgManagerInstallOk> => ({
                workspaceInfo,
                type: SmokerEvent.PkgManagerInstallOk,
                manifests,
                pkgManager,
                totalPkgs,
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
                context: {pkgManagers = [], totalPkgs},
                event: {pkgManager, manifests, error, workspaceInfo},
              }): DataForEvent<typeof SmokerEvent.PkgManagerInstallFailed> => ({
                type: SmokerEvent.PkgManagerInstallFailed,
                workspaceInfo,
                manifests,
                pkgManager,
                error,
                totalPkgs,
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
              pkgManagers,
              workspaceInfo,
              error,
              totalPkgs,
            },
          }):
            | DataForEvent<typeof SmokerEvent.InstallFailed>
            | DataForEvent<typeof SmokerEvent.InstallOk> => {
            return error
              ? {
                  error: error as InstallError,
                  type: SmokerEvent.InstallFailed,
                  pkgManagers,
                  additionalDeps,
                  totalPkgs,
                  workspaceInfo,
                }
              : {
                  type: SmokerEvent.InstallOk,
                  pkgManagers,
                  additionalDeps,
                  totalPkgs,
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
