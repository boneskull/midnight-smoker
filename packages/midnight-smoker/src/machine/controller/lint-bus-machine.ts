import {fromUnknownError} from '#error';
import {SmokerEvent, type EventData} from '#event';
import {type ReporterMachine} from '#machine/reporter';
import {FINAL} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {
  type LintResult,
  type LintResultOk,
  type SomeRule,
  type StaticPkgManagerSpec,
  type WorkspaceInfo,
} from '#schema';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {type ControlMachineEmitted} from './control-machine-events';
import {
  type CtrlPkgManagerLintBeginEvent,
  type CtrlPkgManagerLintFailedEvent,
  type CtrlPkgManagerLintOkEvent,
  type CtrlRuleBeginEvent,
  type CtrlRuleErrorEvent,
  type CtrlRuleFailedEvent,
  type CtrlRuleOkEvent,
} from './lint-events';

export interface LintBusMachineInput {
  workspaceInfo: WorkspaceInfo[];
  smokerOptions: SmokerOptions;
  pkgManagers: StaticPkgManagerSpec[];
  uniquePkgNames: string[];
  parentRef: AnyActorRef;
  rules: SomeRule[];
}

export interface LintBusMachineContext extends LintBusMachineInput {
  actorIds?: string[];
  pkgManagerDidLintCount: number;
  error?: Error;
  lintResults?: LintResult[];
}

export interface LintBusMachineLintEvent {
  type: 'LINT';
  actorIds: string[];
}

export type LintBusMachineEvents =
  | LintBusMachineLintEvent
  | CtrlRuleBeginEvent
  | CtrlRuleOkEvent
  | CtrlRuleFailedEvent
  | CtrlPkgManagerLintBeginEvent
  | CtrlPkgManagerLintOkEvent
  | CtrlPkgManagerLintFailedEvent
  | CtrlRuleErrorEvent;

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
        LINT: {
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
              pkgManagers = [],
              smokerOptions,
              uniquePkgNames: uniquePkgs = [],
            },
          }): EventData<typeof SmokerEvent.LintBegin> => ({
            type: SmokerEvent.LintBegin,
            config: smokerOptions.rules,
            totalRules: 0,
            totalPkgManagers: pkgManagers.length,
            totalUniquePkgs: uniquePkgs.length,
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
        'LINT.RULE_BEGIN': {
          actions: [
            {
              type: 'report',
              params: ({
                context: {rules},
                event,
              }): EventData<typeof SmokerEvent.RuleBegin> => {
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
                context: {rules},
                event,
              }): EventData<typeof SmokerEvent.RuleOk> => {
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
                context: {rules},
                event,
              }): EventData<typeof SmokerEvent.RuleError> => {
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
                context: {rules},
                event,
              }): EventData<typeof SmokerEvent.RuleFailed> => {
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
                context: {pkgManagers = [], rules = []},
                event: {pkgManager},
              }): EventData<typeof SmokerEvent.PkgManagerLintBegin> => {
                return {
                  type: SmokerEvent.PkgManagerLintBegin,
                  pkgManager,
                  totalRules: rules.length,
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
                context: {pkgManagers = [], rules = []},
                event: {pkgManager, results},
              }): EventData<typeof SmokerEvent.PkgManagerLintFailed> => {
                return {
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
                context: {pkgManagers = [], rules = []},
                event: {pkgManager, results},
              }): EventData<typeof SmokerEvent.PkgManagerLintOk> => {
                return {
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
              uniquePkgNames = [],
              rules = [],
              lintResults = [],
              smokerOptions: {rules: config},
            },
            event,
          }):
            | EventData<typeof SmokerEvent.LintOk>
            | EventData<typeof SmokerEvent.LintFailed> => {
            const totalRules = rules.length;
            const totalPkgManagers = pkgManagers.length;
            const totalUniquePkgs = uniquePkgNames.length;

            if (lintResults.some((result) => result.type === 'FAILED')) {
              return {
                ...event,
                results: lintResults,
                config,
                totalRules,
                totalPkgManagers,
                totalUniquePkgs,
                type: SmokerEvent.LintFailed,
              };
            }
            return {
              ...event,
              results: lintResults as LintResultOk[],
              config,
              totalRules: rules.length,
              totalPkgManagers: pkgManagers.length,
              totalUniquePkgs: uniquePkgNames.length,
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
