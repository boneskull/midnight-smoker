import {FAILED, FINAL} from '#constants';
import {SmokerEvent} from '#event/event-constants';
import {type DataForEvent} from '#event/events';
import {type LintEventData} from '#event/lint-events';
import {type ReporterMachine} from '#machine/reporter';
import {type SmokerOptions} from '#options/options';
import {type LintResult, type LintResultOk} from '#schema/lint-result';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {fromUnknownError} from '#util/error-util';
import {asResult} from '#util/result';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type ListenEvent} from './control-machine-events';
import {type CtrlLintEvent} from './lint-events';

export interface LintBusMachineInput {
  workspaceInfo: WorkspaceInfo[];
  smokerOptions: SmokerOptions;
  pkgManagers: StaticPkgManagerSpec[];
  parentRef: AnyActorRef;
  ruleDefs: SomeRuleDef[];
}

export interface LintBusMachineContext extends LintBusMachineInput {
  actorIds?: string[];
  pkgManagerDidLintCount: number;
  error?: Error;
  lintResults?: LintResult[];
}

export type LintBusMachineEvents = ListenEvent | CtrlLintEvent;

export type ReportableLintEventData = DataForEvent<keyof LintEventData>;

export const LintBusMachine = setup({
  types: {
    input: {} as LintBusMachineInput,
    context: {} as LintBusMachineContext,
    events: {} as LintBusMachineEvents,
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    isLintingComplete: ({
      context: {pkgManagerDidLintCount, pkgManagers = []},
    }) => {
      return pkgManagerDidLintCount === pkgManagers.length;
    },
  },
  actions: {
    appendLintResults: assign({
      lintResults: ({context: {lintResults = []}}, results: LintResult[]) => {
        return [...lintResults, ...results];
      },
    }),
    report: enqueueActions(
      (
        {enqueue, context: {actorIds: machines = [], parentRef}},
        event: ReportableLintEventData,
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
    incrementLintCount: assign({
      pkgManagerDidLintCount: ({context: {pkgManagerDidLintCount}}) => {
        return pkgManagerDidLintCount + 1;
      },
    }),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
  },
}).createMachine({
  id: 'LintBusMachine',
  systemId: 'LintBusMachine',
  context: ({input}) => ({...input, pkgManagerDidLintCount: 0}),
  initial: 'idle',
  states: {
    idle: {
      on: {
        LISTEN: {
          actions: [assign({actorIds: ({event: {actorIds}}) => actorIds})],
          target: 'listening',
        },
      },
    },
    listening: {
      entry: [
        {
          type: 'report',
          params: ({
            context: {pkgManagers = [], smokerOptions, ruleDefs, workspaceInfo},
          }): DataForEvent<typeof SmokerEvent.LintBegin> => ({
            type: SmokerEvent.LintBegin,
            config: smokerOptions.rules,
            totalRules: ruleDefs.length,
            pkgManagers,
            workspaceInfo: workspaceInfo.map(asResult),
          }),
        },
      ],
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
      on: {
        'LINT.RULE_END': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {ruleDefs: rules},
                event,
              }): DataForEvent<typeof SmokerEvent.RuleEnd> => {
                return {
                  ...event,
                  totalRules: rules.length,
                  type: SmokerEvent.RuleEnd,
                };
              },
            },
          ],
        },
        'LINT.RULE_BEGIN': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {ruleDefs: rules},
                event,
              }): DataForEvent<typeof SmokerEvent.RuleBegin> => {
                return {
                  ...event,
                  totalRules: rules.length,
                  type: SmokerEvent.RuleBegin,
                };
              },
            },
          ],
        },
        'LINT.RULE_OK': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {ruleDefs: rules},
                event,
              }): DataForEvent<typeof SmokerEvent.RuleOk> => {
                return {
                  ...event,
                  totalRules: rules.length,
                  type: SmokerEvent.RuleOk,
                };
              },
            },
          ],
        },
        'LINT.RULE_ERROR': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {ruleDefs: rules},
                event,
              }): DataForEvent<typeof SmokerEvent.RuleError> => {
                return {
                  ...event,
                  totalRules: rules.length,
                  type: SmokerEvent.RuleError,
                };
              },
            },
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
          ],
        },
        'LINT.RULE_FAILED': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {ruleDefs: rules},
                event,
              }): DataForEvent<typeof SmokerEvent.RuleFailed> => {
                return {
                  ...event,
                  totalRules: rules.length,
                  type: SmokerEvent.RuleFailed,
                };
              },
            },
          ],
        },
        'LINT.PKG_MANAGER_LINT_BEGIN': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers = [],
                  ruleDefs: rules = [],
                  workspaceInfo,
                },
                event: {pkgManager},
              }): DataForEvent<typeof SmokerEvent.PkgManagerLintBegin> => {
                return {
                  type: SmokerEvent.PkgManagerLintBegin,
                  pkgManager,
                  totalRules: rules.length,
                  workspaceInfo: workspaceInfo.map(asResult),
                  totalPkgManagers: pkgManagers.length,
                };
              },
            },
          ],
        },
        'LINT.PKG_MANAGER_LINT_FAILED': {
          actions: [
            assign({
              pkgManagerDidLintCount: ({context: {pkgManagerDidLintCount}}) =>
                pkgManagerDidLintCount + 1,
            }),
            {
              type: 'appendLintResults',
              params: ({event: {results}}) => results,
            },
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers = [],
                  ruleDefs: rules = [],
                  workspaceInfo,
                },
                event: {pkgManager, results},
              }): DataForEvent<typeof SmokerEvent.PkgManagerLintFailed> => {
                return {
                  workspaceInfo: workspaceInfo.map(asResult),
                  type: SmokerEvent.PkgManagerLintFailed,
                  pkgManager,
                  results,
                  totalRules: rules.length,
                  totalPkgManagers: pkgManagers.length,
                };
              },
            },
          ],
        },
        'LINT.PKG_MANAGER_LINT_OK': {
          actions: [
            assign({
              pkgManagerDidLintCount: ({context: {pkgManagerDidLintCount}}) =>
                pkgManagerDidLintCount + 1,
            }),
            {
              type: 'appendLintResults',
              params: ({event: {results}}) => results,
            },
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers = [],
                  ruleDefs: rules = [],
                  workspaceInfo,
                },
                event: {pkgManager, results},
              }): DataForEvent<typeof SmokerEvent.PkgManagerLintOk> => {
                return {
                  workspaceInfo: workspaceInfo.map(asResult),
                  type: SmokerEvent.PkgManagerLintOk,
                  pkgManager,
                  results,
                  totalRules: rules.length,
                  totalPkgManagers: pkgManagers.length,
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
              pkgManagers = [],
              ruleDefs: rules = [],
              lintResults = [],
              smokerOptions: {rules: config},
              workspaceInfo,
            },
            event,
          }):
            | DataForEvent<typeof SmokerEvent.LintOk>
            | DataForEvent<typeof SmokerEvent.LintFailed> => {
            const totalRules = rules.length;

            if (lintResults.some((result) => result.type === FAILED)) {
              return {
                ...event,
                results: lintResults,
                config,
                totalRules,
                pkgManagers,
                workspaceInfo: workspaceInfo.map(asResult),
                type: SmokerEvent.LintFailed,
              };
            }
            return {
              ...event,
              results: lintResults as LintResultOk[],
              config,
              totalRules: rules.length,
              pkgManagers,
              workspaceInfo: workspaceInfo.map(asResult),
              type: SmokerEvent.LintOk,
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
