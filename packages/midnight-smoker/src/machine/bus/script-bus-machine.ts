import {ERROR, FAILED, FINAL, SKIPPED} from '#constants';
import {ScriptEvents} from '#constants/event';
import {type EventData} from '#event/events';
import {type ScriptEventData} from '#event/script-events';
import {
  type SmokeMachineScriptEvent,
  type SomeSmokeMachineRunScriptResultEvent,
} from '#machine/event/script';
import {type RunScriptResult} from '#schema/pkg-manager/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';
import {type SmokerOptions} from '#schema/smoker-options';
import {type WorkspaceInfo} from '#schema/workspace-info';
import * as assert from '#util/assert';
import {toResult} from '#util/result';
import {partition} from 'remeda';
import {type AnyActorRef, assign, enqueueActions, setup} from 'xstate';

import {type ListenEvent} from './common-event';

export interface ScriptBusMachineInput {
  parentRef: AnyActorRef;
  pkgManagers: StaticPkgManagerSpec[];
  smokerOptions: SmokerOptions;
  workspaceInfo: WorkspaceInfo[];
}

export interface ScriptBusMachineContext extends ScriptBusMachineInput {
  actorIds?: string[];
  error?: Error;
  pkgManagerDidRunScriptCount: number;
  runScriptResults?: RunScriptResult[];
}

export type ScriptBusMachineEvent = ListenEvent | SmokeMachineScriptEvent;

export type ReportableScriptEventData = EventData<keyof ScriptEventData>;

export const ScriptBusMachine = setup({
  actions: {
    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: RunScriptResult,
      ) => [...runScriptResults, runScriptResult],
    }),
    handleScriptResult: enqueueActions(
      ({enqueue}, event: SomeSmokeMachineRunScriptResultEvent) => {
        // @ts-expect-error TS sux
        enqueue({params: event, type: 'report'});

        enqueue({
          // @ts-expect-error TS sux
          params: event.result,
          type: 'appendRunScriptResult',
        });
      },
    ),
    incrementScriptCount: assign({
      pkgManagerDidRunScriptCount: ({context: {pkgManagerDidRunScriptCount}}) =>
        pkgManagerDidRunScriptCount + 1,
    }),
    report: enqueueActions(
      (
        {context: {actorIds = [], parentRef}, enqueue},
        params:
          | {andParent: true; event: ReportableScriptEventData}
          | ReportableScriptEventData,
      ) => {
        let event: ReportableScriptEventData;
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
    didRunAllScripts: ({
      context: {
        pkgManagerDidRunScriptCount,
        pkgManagers = [],
        smokerOptions: {
          script: {length: scriptCount},
        },
        workspaceInfo: {length: workspaceCount},
      },
    }) =>
      pkgManagerDidRunScriptCount ===
      pkgManagers.length * scriptCount * workspaceCount,
    hasError: ({context: {error}}) => !!error,
  },
  types: {
    context: {} as ScriptBusMachineContext,
    events: {} as ScriptBusMachineEvent,
    input: {} as ScriptBusMachineInput,
  },
}).createMachine({
  context: ({input}) => ({...input, pkgManagerDidRunScriptCount: 0}),
  id: 'ScriptBusMachine',
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
          actions: [assign({actorIds: ({event: {actorIds = []}}) => actorIds})],
          target: 'working',
        },
      },
    },
    working: {
      always: [
        {
          guard: 'didRunAllScripts',
          target: 'done',
        },
      ],
      entry: [
        {
          params: ({
            context: {
              pkgManagers = [],
              smokerOptions: {script: scripts},
              workspaceInfo,
            },
          }): {
            andParent: true;
            event: EventData<typeof ScriptEvents.ScriptsBegin>;
          } => ({
            andParent: true,
            event: {
              pkgManagers,
              totalScripts: scripts.length,
              type: ScriptEvents.ScriptsBegin,
              workspaceInfo,
            },
          }),
          type: 'report',
        },
      ],
      exit: [
        {
          params: ({
            context: {
              pkgManagers,
              runScriptResults = [],
              smokerOptions: {
                script: {length: totalScripts},
              },
              workspaceInfo,
            },
          }): {
            andParent: true;
            event: EventData<
              typeof ScriptEvents.ScriptsFailed | typeof ScriptEvents.ScriptsOk
            >;
          } => {
            const [failedResults, otherResults] = partition(
              runScriptResults,
              (result) => result.type === FAILED,
            );
            const [skippedResults, moreOtherResults] = partition(
              otherResults,
              (result) => result.type === SKIPPED,
            );
            const [erroredResults, passedResults] = partition(
              moreOtherResults,
              (result) => result.type === ERROR,
            );

            const failed = failedResults.length;
            const passed = passedResults.length;
            const skipped = skippedResults.length;
            const errored = erroredResults.length;

            assert.equal(
              totalScripts * pkgManagers.length,
              passed + skipped + failed + errored,
              `Expected passed ${passed} + skipped ${skipped} + failed ${failed} + errored ${errored} to equal total scripts ${totalScripts} * total pkg managers ${pkgManagers.length}`,
            );
            const type = failed
              ? ScriptEvents.ScriptsFailed
              : ScriptEvents.ScriptsOk;

            return {
              andParent: true,
              event: {
                failed,
                passed,
                pkgManagers,
                results: runScriptResults,
                skipped,
                totalScripts,
                type,
                workspaceInfo,
              },
            };
          },
          type: 'report',
        },
      ],
      on: {
        [ScriptEvents.PkgManagerScriptsBegin]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  smokerOptions: {
                    script: {length: totalScripts},
                  },
                  workspaceInfo,
                },
                event: {manifests, pkgManager},
              }): EventData<typeof ScriptEvents.PkgManagerScriptsBegin> => ({
                manifests,
                pkgManager,
                totalPkgManagers,
                totalScripts,
                type: ScriptEvents.PkgManagerScriptsBegin,
                workspaceInfo: workspaceInfo.map(toResult),
              }),
              type: 'report',
            },
          ],
        },
        [ScriptEvents.PkgManagerScriptsFailed]: {
          actions: [
            'incrementScriptCount',
            {
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {script: scripts},
                },
                event,
              }): EventData<typeof ScriptEvents.PkgManagerScriptsFailed> => ({
                ...event,
                totalPkgManagers: pkgManagers.length,
                totalScripts: scripts.length,
                type: ScriptEvents.PkgManagerScriptsFailed,
              }),
              type: 'report',
            },
          ],
        },
        [ScriptEvents.PkgManagerScriptsOk]: {
          actions: [
            'incrementScriptCount',
            {
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {
                    script: {length: totalScripts},
                  },
                },
                event,
              }): EventData<typeof ScriptEvents.PkgManagerScriptsOk> => ({
                ...event,
                totalPkgManagers: pkgManagers.length,
                totalScripts,
                type: ScriptEvents.PkgManagerScriptsOk,
              }),
              type: 'report',
            },
          ],
        },
        [ScriptEvents.RunScriptBegin]: {
          actions: [
            {
              params: ({
                context: {
                  smokerOptions: {script: scripts},
                },
                event: {manifest, pkgManager},
              }): EventData<typeof ScriptEvents.RunScriptBegin> => ({
                manifest,
                pkgManager,
                totalScripts: scripts.length,
                type: ScriptEvents.RunScriptBegin,
              }),
              type: 'report',
            },
          ],
        },
        [ScriptEvents.RunScriptEnd]: {
          actions: [
            {
              params: ({
                context: {
                  smokerOptions: {
                    script: {length: totalScripts},
                  },
                },
                event,
              }): EventData<typeof ScriptEvents.RunScriptEnd> => ({
                ...event,
                totalScripts,
              }),
              type: 'report',
            },
          ],
        },
        'SCRIPTS.SCRIPT.RESULT.*': {
          actions: {
            params: ({event}) => event,
            type: 'handleScriptResult',
          },
        },
      },
    },
  },
  systemId: 'ScriptBusMachine',
});
