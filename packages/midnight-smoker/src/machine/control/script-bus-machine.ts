import {FAILED, FINAL, OK, SKIPPED} from '#constants';
import {fromUnknownError} from '#error/from-unknown-error';
import {SmokerEvent} from '#event/event-constants';
import {type DataForEvent} from '#event/events';
import {type ScriptEventData} from '#event/script-events';
import {type ReporterMachine} from '#machine/reporter';
import {type SmokerOptions} from '#options/options';
import {type RunScriptResult} from '#schema/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {asResult} from '#util/util';
import {partition} from 'lodash';
import assert from 'node:assert';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type ListenEvent} from './control-machine-events';
import {type CtrlScriptEvents} from './script-events';

export interface ScriptBusMachineInput {
  smokerOptions: SmokerOptions;
  pkgManagers: StaticPkgManagerSpec[];
  parentRef: AnyActorRef;
  workspaceInfo: WorkspaceInfo[];
}

export interface ScriptBusMachineContext extends ScriptBusMachineInput {
  actorIds?: string[];
  pkgManagerDidRunScriptCount: number;
  error?: Error;
  runScriptResults?: RunScriptResult[];
}

export type ScriptBusMachineEvent = ListenEvent | CtrlScriptEvents;

export type ReportableScriptEventData = DataForEvent<keyof ScriptEventData>;

export const ScriptBusMachine = setup({
  types: {
    input: {} as ScriptBusMachineInput,
    context: {} as ScriptBusMachineContext,
    events: {} as ScriptBusMachineEvent,
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    isScriptingComplete: ({
      context: {
        pkgManagerDidRunScriptCount: pkgManagerDidScriptCount,
        pkgManagers = [],
      },
    }) => pkgManagerDidScriptCount === pkgManagers.length,
  },
  actions: {
    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: RunScriptResult,
      ) => [...runScriptResults, runScriptResult],
    }),
    report: enqueueActions(
      (
        {enqueue, context: {actorIds: machines = [], parentRef}},
        event: ReportableScriptEventData,
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
      }) => pkgManagerDidScriptCount + 1,
    }),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QGUDGAnAlgBwC4CEBXWAWQENUALTAOzADpMIAbMAYgBkBJZAFQFEAcgG0ADAF1EobAHtYmXJhk0pIAB6IAjACYArPQCcRgwHYAbNs3mTog7oA0IAJ6IDADlH1tAFhOWAzCYGmt4GFgC+4Y5oWHhEpBTUdPQA7jLoANa0UGzIAMIASlwACrz0BQCqggD6+UWl1fj8AOJcIhKqsvKKyqoaCP6i3vQe3mZB2iZj-t5uji4Ibm763oH+urOaZma6PpHRGDgExORUtAxpmdm5hSVllTV1d9UAYgCCXBz8ACJikkggLoKJQqAH9QbaeiafzaUawsx2NxheaIcz+eiifyaHSaIzeTRIsz7EAxI7xU5JC7pLI0HJPUrlKq1W4NZAAaRKxR+f06cmBvTBiG0dkMlmWJj8-jcWwczkQZm8ngssyRVis2nGxNJcROiXOqWp13p9yZxuqAHk2TyAUCeqDQOCtoZzLpdCZpSYYbsUQhdASvASdmYZgYNf4DFrDjqEmdkpcaXSWSbHknqkJfh0bXy7X1EFjIaJtDM9GHxnZvD7vNpIRrXUExm5FcKiVESVHjjHKQarrSbvUysU2c1qiQ3oI3s1+AVqg9mf3kI0Wm1rdJsyDcwgiwYoboLKIzI3xrtXT6YWZ6PndIXdG4TBsCSZI7EOxT9fGjUn6IPh6Px5Pp7OxoLpaK6AmuAoOkKfoXrC2ISu6Bi+P4PraJihj7hqpg7KIQT7k+ZK6rGVI9om-ZfkOI5jhOU4zqaSYLu8nzcpmq7dOugqbv456zKsWLLAYOHjNoPrSvQV6iJiCJVmYWx6Ph0avnGhq9qBtrsZBCDBsMnreIqqwKhJ4Y+u42lFlMohuHovgIvJL56kpJFsMImj-Kx-L2uo8ozPQOl6VxiqYgYPqaEM6LVoEuK8SYmgbJErY0DIEBwKo2p2URvJsRBnkIAAtGYPp5bZ5L2QwTCsBl7kblWwWGfQSHmMKkweJ6RWEV2760hVOYces6Lho2ehuIMPEbMZbjnuGoVbKYfrrK1nb6hAyhgF16nZUsbiGIEu4bFiZiiN6coICF+J1Z6d6iDoG0ta2qXFUR9BgOg6DpJAq1Zf0G1bXeOyrFsB3CUd7iQqYgTRbs+6zC2kRAA
   */
  id: 'ScriptBusMachine',
  systemId: 'ScriptBusMachine',
  context: ({input}) => ({...input, pkgManagerDidRunScriptCount: 0}),
  initial: 'idle',
  states: {
    idle: {
      on: {
        LISTEN: {
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
              workspaceInfo,
            },
          }): DataForEvent<typeof SmokerEvent.RunScriptsBegin> => ({
            pkgManagers,
            workspaceInfo,
            type: SmokerEvent.RunScriptsBegin,
            totalScripts: scripts.length,
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
                event: {manifest, pkgManager},
              }): DataForEvent<typeof SmokerEvent.RunScriptBegin> => ({
                type: SmokerEvent.RunScriptBegin,
                totalScripts: scripts.length,
                pkgManager,
                manifest,
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
                event: {manifest, pkgManager, error, rawResult},
              }): DataForEvent<typeof SmokerEvent.RunScriptFailed> => ({
                type: SmokerEvent.RunScriptFailed,
                totalScripts: scripts.length,
                pkgManager,
                manifest,
                error,
                rawResult,
              }),
            },
            {
              type: 'appendRunScriptResult',
              params: ({event: {manifest, error, rawResult}}) => ({
                manifest,
                error,
                rawResult,
                type: FAILED,
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
                event: {manifest, pkgManager},
              }): DataForEvent<typeof SmokerEvent.RunScriptSkipped> => ({
                type: SmokerEvent.RunScriptSkipped,
                totalScripts: scripts.length,
                pkgManager,
                manifest,
              }),
            },
            {
              type: 'appendRunScriptResult',
              params: ({event: {manifest}}) => ({type: SKIPPED, manifest}),
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
                  event: {manifest, pkgManager, rawResult},
                }): DataForEvent<typeof SmokerEvent.RunScriptOk> => ({
                  type: SmokerEvent.RunScriptOk,
                  totalScripts: scripts.length,
                  pkgManager,
                  manifest,
                  rawResult,
                }),
              },
              {
                type: 'appendRunScriptResult',
                params: ({event: {manifest, rawResult}}) => ({
                  manifest,
                  rawResult,
                  type: OK,
                }),
              },
            ],
          },
        ],
        'SCRIPT.RUN_SCRIPT_END': [
          {
            actions: [
              {
                type: 'report',
                params: ({
                  context: {
                    smokerOptions: {script: scripts},
                  },
                  event,
                }): DataForEvent<typeof SmokerEvent.RunScriptEnd> => ({
                  ...event,
                  type: SmokerEvent.RunScriptEnd,
                  totalScripts: scripts.length,
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
                    pkgManagers: {length: totalPkgManagers},
                    smokerOptions: {
                      script: {length: totalUniqueScripts},
                    },
                    workspaceInfo,
                  },
                  event: {pkgManager, manifests},
                }): DataForEvent<
                  typeof SmokerEvent.PkgManagerRunScriptsBegin
                > => ({
                  workspaceInfo: workspaceInfo.map(asResult),
                  manifests,
                  type: SmokerEvent.PkgManagerRunScriptsBegin,
                  pkgManager,
                  totalPkgManagers,
                  totalScripts: totalUniqueScripts,
                }),
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
                },
                event,
              }): DataForEvent<typeof SmokerEvent.PkgManagerRunScriptsOk> => ({
                ...event,
                type: SmokerEvent.PkgManagerRunScriptsOk,
                totalPkgManagers: pkgManagers.length,
                totalScripts: scripts.length,
              }),
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
                },
                event,
              }): DataForEvent<
                typeof SmokerEvent.PkgManagerRunScriptsFailed
              > => ({
                ...event,
                type: SmokerEvent.PkgManagerRunScriptsFailed,
                totalPkgManagers: pkgManagers.length,
                totalScripts: scripts.length,
              }),
            },
          ],
        },
      },
      exit: [
        {
          type: 'report',
          params: ({
            context: {
              runScriptResults: results,
              pkgManagers,
              workspaceInfo,
              smokerOptions: {
                script: {length: totalUniqueScripts},
              },
            },
          }): DataForEvent<
            | typeof SmokerEvent.RunScriptsOk
            | typeof SmokerEvent.RunScriptsFailed
          > => {
            assert.ok(results);
            const [failedResults, otherResults] = partition(results, 'error');
            const failed = failedResults.length;
            const [skippedResults, passedResults] = partition(otherResults, {
              skipped: true,
            });
            const passed = passedResults.length;
            const skipped = skippedResults.length;

            const type = failed
              ? SmokerEvent.RunScriptsFailed
              : SmokerEvent.RunScriptsOk;

            return {
              type,
              passed,
              skipped,
              failed,
              totalScripts: totalUniqueScripts,
              workspaceInfo,
              pkgManagers,
              results,
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
