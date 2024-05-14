import {fromUnknownError} from '#error';
import {SmokerEvent, type EventData} from '#event';
import {type ReporterMachine} from '#machine/reporter';
import {FINAL} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type RunScriptResult, type StaticPkgManagerSpec} from '#schema';
import {partition} from 'lodash';
import assert from 'node:assert';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type ControlMachineEmitted} from './control-machine-events';
import {type CtrlScriptEvents} from './script-events';

export interface ScriptBusMachineInput {
  smokerOptions: SmokerOptions;
  pkgManagers: StaticPkgManagerSpec[];
  uniquePkgNames: string[];
  parentRef: AnyActorRef;
}

export interface ScriptBusMachineContext extends ScriptBusMachineInput {
  actorIds?: string[];
  pkgManagerDidRunScriptCount: number;
  error?: Error;
  runScriptResults?: RunScriptResult[];
}

export interface ScriptBusMachineRunScriptsEvent {
  type: 'RUN_SCRIPTS';
  actorIds: string[];
}

export type ScriptBusMachineEvents =
  | ScriptBusMachineRunScriptsEvent
  | CtrlScriptEvents;

export const ScriptBusMachine = setup({
  types: {
    input: {} as ScriptBusMachineInput,
    context: {} as ScriptBusMachineContext,
    events: {} as ScriptBusMachineEvents,
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    isScriptingComplete: ({
      context: {
        pkgManagerDidRunScriptCount: pkgManagerDidScriptCount,
        pkgManagers = [],
      },
    }) => {
      return pkgManagerDidScriptCount === pkgManagers.length;
    },
  },
  actions: {
    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: RunScriptResult,
      ) => {
        return [...runScriptResults, runScriptResult];
      },
    }),
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
    incrementScriptCount: assign({
      pkgManagerDidRunScriptCount: ({
        context: {pkgManagerDidRunScriptCount: pkgManagerDidScriptCount},
      }) => {
        return pkgManagerDidScriptCount + 1;
      },
    }),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
  },
}).createMachine({
  id: 'ScriptBusMachine',
  systemId: 'ScriptBusMachine',
  context: ({input}) => ({...input, pkgManagerDidRunScriptCount: 0}),
  initial: 'idle',
  states: {
    idle: {
      on: {
        RUN_SCRIPTS: {
          actions: [assign({actorIds: ({event: {actorIds = []}}) => actorIds})],
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
              smokerOptions: {script: scripts},
              uniquePkgNames: uniquePkgs = [],
            },
          }): EventData<typeof SmokerEvent.RunScriptsBegin> => ({
            type: SmokerEvent.RunScriptsBegin,
            totalUniqueScripts: scripts.length,
            totalUniquePkgs: uniquePkgs.length,
            totalPkgManagers: pkgManagers.length,
          }),
        },
      ],
      always: [
        {
          guard: 'hasError',
          target: 'errored',
        },
        {
          guard: 'isScriptingComplete',
          target: 'done',
        },
      ],
      on: {
        'SCRIPT.RUN_SCRIPT_BEGIN': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  smokerOptions: {script: scripts},
                },
                event: {runScriptManifest, pkgManager},
              }): EventData<typeof SmokerEvent.RunScriptBegin> => ({
                type: SmokerEvent.RunScriptBegin,
                totalUniqueScripts: scripts.length,
                pkgManager,
                manifest: runScriptManifest,
              }),
            },
          ],
        },
        'SCRIPT.RUN_SCRIPT_FAILED': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  smokerOptions: {script: scripts},
                },
                event: {runScriptManifest, pkgManager, result},
              }): EventData<typeof SmokerEvent.RunScriptFailed> => {
                assert.ok(result.error);
                return {
                  type: SmokerEvent.RunScriptFailed,
                  totalUniqueScripts: scripts.length,
                  pkgManager,
                  manifest: runScriptManifest,
                  error: result.error,
                };
              },
            },
            {
              type: 'appendRunScriptResult',
              params: ({
                event: {
                  result: {error},
                },
              }) => ({
                error,
              }),
            },
          ],
        },
        'SCRIPT.RUN_SCRIPT_SKIPPED': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  smokerOptions: {script: scripts},
                },
                event: {runScriptManifest, pkgManager},
              }): EventData<typeof SmokerEvent.RunScriptSkipped> => ({
                type: SmokerEvent.RunScriptSkipped,
                totalUniqueScripts: scripts.length,
                pkgManager,
                skipped: true,
                manifest: runScriptManifest,
              }),
            },
            {
              type: 'appendRunScriptResult',
              params: {skipped: true},
            },
          ],
        },
        'SCRIPT.RUN_SCRIPT_OK': [
          {
            actions: [
              {
                type: 'report',
                params: ({
                  context: {
                    smokerOptions: {script: scripts},
                  },
                  event: {runScriptManifest, pkgManager, result},
                }): EventData<typeof SmokerEvent.RunScriptOk> => {
                  assert.ok(result.rawResult);
                  return {
                    type: SmokerEvent.RunScriptOk,
                    totalUniqueScripts: scripts.length,
                    pkgManager,
                    manifest: runScriptManifest,
                    rawResult: result.rawResult,
                  };
                },
              },
              {
                type: 'appendRunScriptResult',
                params: ({
                  event: {
                    result: {rawResult},
                  },
                }) => ({
                  rawResult,
                }),
              },
            ],
          },
        ],
        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN': [
          {
            actions: [
              {
                type: 'report',
                params: ({
                  context: {
                    pkgManagers = [],
                    smokerOptions: {script: scripts},
                    uniquePkgNames = [],
                  },
                  event: {pkgManager, manifests},
                }): EventData<typeof SmokerEvent.PkgManagerRunScriptsBegin> => {
                  return {
                    manifests,
                    type: SmokerEvent.PkgManagerRunScriptsBegin,
                    pkgManager,
                    totalPkgManagers: pkgManagers.length,
                    totalUniqueScripts: scripts.length,
                    totalUniquePkgs: uniquePkgNames.length,
                  };
                },
              },
            ],
          },
        ],
        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK': {
          actions: [
            {
              type: 'incrementScriptCount',
            },
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {script: scripts},
                  uniquePkgNames,
                },
                event,
              }): EventData<typeof SmokerEvent.PkgManagerRunScriptsOk> => {
                return {
                  ...event,
                  type: SmokerEvent.PkgManagerRunScriptsOk,
                  totalPkgManagers: pkgManagers.length,
                  totalUniqueScripts: scripts.length,
                  totalUniquePkgs: uniquePkgNames.length,
                };
              },
            },
          ],
        },
        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED': {
          actions: [
            {type: 'incrementScriptCount'},
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {script: scripts},
                  uniquePkgNames,
                },
                event,
              }): EventData<typeof SmokerEvent.PkgManagerRunScriptsFailed> => {
                return {
                  ...event,
                  type: SmokerEvent.PkgManagerRunScriptsFailed,
                  totalPkgManagers: pkgManagers.length,
                  totalUniqueScripts: scripts.length,
                  totalUniquePkgs: uniquePkgNames.length,
                };
              },
            },
          ],
        },
      },
      exit: [
        {
          type: 'report',
          params: ({
            context: {
              runScriptResults,
              pkgManagers = [],
              smokerOptions: {script: scripts},
            },
          }): EventData<
            | typeof SmokerEvent.RunScriptsOk
            | typeof SmokerEvent.RunScriptsFailed
          > => {
            assert.ok(runScriptResults);
            const [failedResults, otherResults] = partition(
              runScriptResults,
              'error',
            );
            const failed = failedResults.length;
            const [skippedResults, passedResults] = partition(otherResults, {
              skipped: true,
            });
            const passed = passedResults.length;
            const skipped = skippedResults.length;

            const type = failed
              ? SmokerEvent.RunScriptsFailed
              : SmokerEvent.RunScriptsOk;

            const pkgNames = new Set<string>();

            return {
              type,
              passed,
              skipped,
              failed,
              totalUniqueScripts: scripts.length,
              totalUniquePkgs: pkgNames.size,
              totalPkgManagers: pkgManagers.length,
              results: runScriptResults,
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
