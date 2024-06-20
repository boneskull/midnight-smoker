/**
 * Lint-related events received by `SmokeMachine`.
 *
 * These events are views into the public events as seen in {@link LintEvent}.
 *
 * @remarks
 * `SmokeMachine` does not listen for each event individually; instead it
 * listens for `LINT.*` events
 * @packageDocumentation
 * @see {@link SmokeMachineLintEvent}
 */
import type * as LintEvent from '#event/lint-events';
import type {MachineEvent} from '#machine/util';

/**
 * These fields are omitted from the `*PkgManager*` events because they are
 * computed by the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
type ComputedPkgManagerLintFields = 'totalPkgManagers' | 'totalRules';

/**
 * These fields are emitted from the `*Pkg*` events because they are computed by
 * the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
type ComputedRuleEventFields = 'totalRules';

/**
 * Lint-related events received by `SmokeMachine`
 *
 * @event
 */
export type SmokeMachineLintEvent =
  | SmokeMachinePkgManagerLintBeginEvent
  | SmokeMachinePkgManagerLintOkEvent
  | SmokeMachinePkgManagerLintFailedEvent
  | SmokeMachineRuleBeginEvent
  | SmokeMachineRuleOkEvent
  | SmokeMachineRuleFailedEvent
  | SmokeMachineRuleEndEvent
  | SmokeMachineRuleErrorEvent;

/**
 * Received from `PkgManagerMachine` when it begins linting.
 *
 * @event
 */
export type SmokeMachinePkgManagerLintBeginEvent = MachineEvent<
  'LINT.PKG_MANAGER_LINT_BEGIN',
  Omit<LintEvent.PkgManagerLintBeginEventData, ComputedPkgManagerLintFields>
>;

/**
 * Received from `PkgManagerMachine` when linting fails.
 *
 * @event
 */
export type SmokeMachinePkgManagerLintFailedEvent = MachineEvent<
  'LINT.PKG_MANAGER_LINT_FAILED',
  Omit<LintEvent.PkgManagerLintFailedEventData, ComputedPkgManagerLintFields>
>;

/**
 * Received from `PkgManagerMachine` when linting succeeds.
 *
 * @event
 */
export type SmokeMachinePkgManagerLintOkEvent = MachineEvent<
  'LINT.PKG_MANAGER_LINT_OK',
  Omit<LintEvent.PkgManagerLintOkEventData, ComputedPkgManagerLintFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check begins.
 *
 * @event
 */
export type SmokeMachineRuleBeginEvent = MachineEvent<
  'LINT.RULE_BEGIN',
  Omit<LintEvent.RuleBeginEventData, ComputedRuleEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check ends (regardless of
 * success or failure).
 *
 * @event
 */
export type SmokeMachineRuleEndEvent = MachineEvent<
  'LINT.RULE_END',
  Omit<LintEvent.RuleEndEventData, ComputedRuleEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check throws an error.
 *
 * @event
 */
export type SmokeMachineRuleErrorEvent = MachineEvent<
  'LINT.RULE_ERROR',
  Omit<LintEvent.RuleErrorEventData, ComputedRuleEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check fails.
 *
 * @event
 */
export type SmokeMachineRuleFailedEvent = MachineEvent<
  'LINT.RULE_FAILED',
  Omit<LintEvent.RuleFailedEventData, ComputedRuleEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check succeeds.
 *
 * @event
 */
export type SmokeMachineRuleOkEvent = MachineEvent<
  'LINT.RULE_OK',
  Omit<LintEvent.RuleOkEventData, ComputedRuleEventFields>
>;
