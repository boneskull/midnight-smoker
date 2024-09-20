import {ERROR, FAILED, FINAL, SKIPPED} from '#constants';
import {ScriptEvents} from '#constants/event';
import {type EventData} from '#event/events';
import {type ScriptEventData} from '#event/script-events';
import {
  type SmokeMachineScriptEvent,
  type SomeSmokeMachineRunScriptResultEvent,
} from '#machine/event/script';
import {type RunScriptResult} from '#schema/run-script-result';
import {type SmokerOptions} from '#schema/smoker-options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import * as assert from '#util/assert';
import {asResult} from '#util/result';
import {partition} from 'lodash';
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
            event: EventData<typeof ScriptEvents.RunScriptsBegin>;
          } => ({
            andParent: true,
            event: {
              pkgManagers,
              totalScripts: scripts.length,
              type: ScriptEvents.RunScriptsBegin,
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
              | typeof ScriptEvents.RunScriptsFailed
              | typeof ScriptEvents.RunScriptsOk
            >;
          } => {
            const [failedResults, otherResults] = partition(runScriptResults, {
              type: FAILED,
            });
            const [skippedResults, moreOtherResults] = partition(otherResults, {
              type: SKIPPED,
            });
            const [erroredResults, passedResults] = partition(
              moreOtherResults,
              {
                type: ERROR,
              },
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
              ? ScriptEvents.RunScriptsFailed
              : ScriptEvents.RunScriptsOk;

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
        [ScriptEvents.PkgManagerRunScriptsBegin]: {
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
              }): EventData<typeof ScriptEvents.PkgManagerRunScriptsBegin> => ({
                manifests,
                pkgManager,
                totalPkgManagers,
                totalScripts,
                type: ScriptEvents.PkgManagerRunScriptsBegin,
                workspaceInfo: workspaceInfo.map(asResult),
              }),
              type: 'report',
            },
          ],
        },
        [ScriptEvents.PkgManagerRunScriptsFailed]: {
          actions: [
            'incrementScriptCount',
            {
              params: ({
                context: {
                  pkgManagers = [],
                  smokerOptions: {script: scripts},
                },
                event,
              }): EventData<
                typeof ScriptEvents.PkgManagerRunScriptsFailed
              > => ({
                ...event,
                totalPkgManagers: pkgManagers.length,
                totalScripts: scripts.length,
                type: ScriptEvents.PkgManagerRunScriptsFailed,
              }),
              type: 'report',
            },
          ],
        },
        [ScriptEvents.PkgManagerRunScriptsOk]: {
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
              }): EventData<typeof ScriptEvents.PkgManagerRunScriptsOk> => ({
                ...event,
                totalPkgManagers: pkgManagers.length,
                totalScripts,
                type: ScriptEvents.PkgManagerRunScriptsOk,
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
                type: ScriptEvents.RunScriptEnd,
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
