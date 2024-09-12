import {FAILED, FINAL} from '#constants';
import {LintEvents} from '#constants/event';
import {type EventData} from '#event/events';
import {type LintEventData} from '#event/lint-events';
import {type LintResult, type LintResultOk} from '#rule/lint-result';
import {type SomeRule} from '#schema/rule';
import {type SmokerOptions} from '#schema/smoker-options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {fromUnknownError} from '#util/error-util';
import {asResult, type Result} from '#util/result';
import {type AnyActorRef, assign, enqueueActions, setup} from 'xstate';

import {type SmokeMachineLintEvent} from '../event/lint';
import {type ListenEvent} from './common-event';

export interface LintBusMachineInput {
  parentRef: AnyActorRef;
  pkgManagers: StaticPkgManagerSpec[];
  ruleDefs: SomeRule[];
  smokerOptions: SmokerOptions;
  workspaceInfo: WorkspaceInfo[];
}

export interface LintBusMachineContext extends LintBusMachineInput {
  actorIds?: string[];
  error?: Error;
  lintResults?: LintResult[];
  pkgManagerDidLintCount: number;
  workspaceInfoResult: Result<WorkspaceInfo>[];
}

export type LintBusMachineEvents = ListenEvent | SmokeMachineLintEvent;

export type ReportableLintEventData = EventData<keyof LintEventData>;

export const LintBusMachine = setup({
  actions: {
    appendLintResults: assign({
      lintResults: ({context: {lintResults = []}}, results: LintResult[]) => {
        return [...lintResults, ...results];
      },
    }),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
    incrementLintCount: assign({
      pkgManagerDidLintCount: ({context: {pkgManagerDidLintCount}}) => {
        return pkgManagerDidLintCount + 1;
      },
    }),
    report: enqueueActions(
      (
        {context: {actorIds = [], parentRef}, enqueue},
        params:
          | {andParent: true; event: ReportableLintEventData}
          | ReportableLintEventData,
      ) => {
        let event: ReportableLintEventData;
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
    isLintingComplete: ({
      context: {pkgManagerDidLintCount, pkgManagers = []},
    }) => {
      return pkgManagerDidLintCount === pkgManagers.length;
    },
  },
  types: {
    context: {} as LintBusMachineContext,
    events: {} as LintBusMachineEvents,
    input: {} as LintBusMachineInput,
  },
}).createMachine({
  context: ({input}) => ({
    ...input,
    pkgManagerDidLintCount: 0,
    workspaceInfoResult: input.workspaceInfo.map(asResult),
  }),
  id: 'LintBusMachine',
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
          actions: [assign({actorIds: ({event: {actorIds}}) => actorIds})],
          target: 'listening',
        },
      },
    },
    listening: {
      always: [
        {
          guard: 'hasError',
          target: 'errored',
        },
        {
          guard: 'isLintingComplete',
          target: 'done',
        },
      ],
      entry: [
        {
          params: ({
            context: {pkgManagers = [], ruleDefs, smokerOptions, workspaceInfo},
          }): {
            andParent: true;
            event: EventData<typeof LintEvents.LintBegin>;
          } => ({
            andParent: true,
            event: {
              config: smokerOptions.rules,
              pkgManagers,
              totalRules: ruleDefs.length,
              type: LintEvents.LintBegin,
              workspaceInfo: workspaceInfo.map(asResult),
            },
          }),
          type: 'report',
        },
      ],
      exit: [
        {
          params: ({
            context: {
              lintResults = [],
              pkgManagers = [],
              ruleDefs: rules = [],
              smokerOptions: {rules: config},
              workspaceInfo,
            },
            event,
          }): {
            andParent: true;
            event: EventData<
              typeof LintEvents.LintFailed | typeof LintEvents.LintOk
            >;
          } => {
            const totalRules = rules.length;

            if (lintResults.some((result) => result.type === FAILED)) {
              return {
                andParent: true,
                event: {
                  ...event,
                  config,
                  pkgManagers,
                  results: lintResults,
                  totalRules,
                  type: LintEvents.LintFailed,
                  workspaceInfo: workspaceInfo.map(asResult),
                },
              };
            }
            return {
              andParent: true,
              event: {
                ...event,
                config,
                pkgManagers,
                results: lintResults as LintResultOk[],
                totalRules: rules.length,
                type: LintEvents.LintOk,
                workspaceInfo: workspaceInfo.map(asResult),
              },
            };
          },
          type: 'report',
        },
      ],
      on: {
        [LintEvents.PkgManagerLintBegin]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers = [],
                  ruleDefs: rules = [],
                  workspaceInfo,
                },
                event: {pkgManager},
              }): EventData<typeof LintEvents.PkgManagerLintBegin> => {
                return {
                  pkgManager,
                  totalPkgManagers: pkgManagers.length,
                  totalRules: rules.length,
                  type: LintEvents.PkgManagerLintBegin,
                  workspaceInfo: workspaceInfo.map(asResult),
                };
              },
              type: 'report',
            },
          ],
        },
        [LintEvents.PkgManagerLintFailed]: {
          actions: [
            assign({
              pkgManagerDidLintCount: ({context: {pkgManagerDidLintCount}}) =>
                pkgManagerDidLintCount + 1,
            }),
            {
              params: ({event: {results}}) => results,
              type: 'appendLintResults',
            },
            {
              params: ({
                context: {
                  pkgManagers = [],
                  ruleDefs: rules = [],
                  workspaceInfo,
                },
                event: {pkgManager, results},
              }): EventData<typeof LintEvents.PkgManagerLintFailed> => {
                return {
                  pkgManager,
                  results,
                  totalPkgManagers: pkgManagers.length,
                  totalRules: rules.length,
                  type: LintEvents.PkgManagerLintFailed,
                  workspaceInfo: workspaceInfo.map(asResult),
                };
              },
              type: 'report',
            },
          ],
        },
        [LintEvents.PkgManagerLintOk]: {
          actions: [
            assign({
              pkgManagerDidLintCount: ({context: {pkgManagerDidLintCount}}) =>
                pkgManagerDidLintCount + 1,
            }),
            {
              params: ({event: {results}}) => results,
              type: 'appendLintResults',
            },
            {
              params: ({
                context: {
                  pkgManagers = [],
                  ruleDefs: rules = [],
                  workspaceInfo,
                },
                event: {pkgManager, results},
              }): EventData<typeof LintEvents.PkgManagerLintOk> => {
                return {
                  pkgManager,
                  results,
                  totalPkgManagers: pkgManagers.length,
                  totalRules: rules.length,
                  type: LintEvents.PkgManagerLintOk,
                  workspaceInfo: workspaceInfo.map(asResult),
                };
              },
              type: 'report',
            },
          ],
        },
        [LintEvents.RuleBegin]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  ruleDefs: {length: totalRules},
                  workspaceInfo: {length: totalPkgs},
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof LintEvents.RuleBegin> => {
                return {
                  ...event,
                  totalPkgManagers,
                  totalPkgs,
                  totalRules,
                  type: LintEvents.RuleBegin,
                  workspaceInfo,
                };
              },
              type: 'report',
            },
          ],
        },
        [LintEvents.RuleEnd]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  ruleDefs: {length: totalRules},
                  workspaceInfo: {length: totalPkgs},
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof LintEvents.RuleEnd> => {
                return {
                  ...event,
                  totalPkgManagers,
                  totalPkgs,
                  totalRules,
                  type: LintEvents.RuleEnd,
                  workspaceInfo,
                };
              },
              type: 'report',
            },
          ],
        },
        [LintEvents.RuleError]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  ruleDefs: {length: totalRules},
                  workspaceInfo: {length: totalPkgs},
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof LintEvents.RuleError> => {
                return {
                  ...event,
                  totalPkgManagers,
                  totalPkgs,
                  totalRules,
                  type: LintEvents.RuleError,
                  workspaceInfo,
                };
              },
              type: 'report',
            },
            {
              params: ({event: {error}}) => ({error}),
              type: 'assignError',
            },
          ],
        },
        [LintEvents.RuleFailed]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  ruleDefs: {length: totalRules},
                  workspaceInfo: {length: totalPkgs},
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof LintEvents.RuleFailed> => {
                return {
                  ...event,
                  totalPkgManagers,
                  totalPkgs,
                  totalRules,
                  type: LintEvents.RuleFailed,
                  workspaceInfo,
                };
              },
              type: 'report',
            },
          ],
        },
        [LintEvents.RuleOk]: {
          actions: [
            {
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  ruleDefs: {length: totalRules},
                  workspaceInfo: {length: totalPkgs},
                  workspaceInfoResult: workspaceInfo,
                },
                event,
              }): EventData<typeof LintEvents.RuleOk> => {
                return {
                  ...event,
                  totalPkgManagers,
                  totalPkgs,
                  totalRules,
                  type: LintEvents.RuleOk,
                  workspaceInfo,
                };
              },
              type: 'report',
            },
          ],
        },
      },
    },
  },
  systemId: 'LintBusMachine',
});
