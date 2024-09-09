/**
 * Lint-related events received by `SmokeMachine`.
 *
 * These events are views into the public events as seen in
 * {@link LintEventData}.
 *
 * @remarks
 * `SmokeMachine` does not listen for each event individually; instead it
 * listens for `LINT.*` events
 * @packageDocumentation
 * @see {@link SmokeMachineLintEvent}
 */
import {
  type LintEvents,
  type PkgManagerLintBeginEventData,
  type PkgManagerLintFailedEventData,
  type PkgManagerLintOkEventData,
  type RuleBeginEventData,
  type RuleEndEventData,
  type RuleErrorEventData,
  type RuleFailedEventData,
  type RuleOkEventData,
} from '#event/lint-events';

import {type MachineEvent} from './common.js';

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
type ComputedRuleEventFields =
  | 'totalPkgManagers'
  | 'totalPkgs'
  | 'totalRules'
  | 'workspaceInfo';

/**
 * Lint-related events received by `SmokeMachine`
 *
 * @event
 */
export type SmokeMachineLintEvent =
  | SmokeMachinePkgManagerLintBeginEvent
  | SmokeMachinePkgManagerLintFailedEvent
  | SmokeMachinePkgManagerLintOkEvent
  | SmokeMachineRuleBeginEvent
  | SmokeMachineRuleEndEvent
  | SmokeMachineRuleErrorEvent
  | SmokeMachineRuleFailedEvent
  | SmokeMachineRuleOkEvent;

/**
 * Received from `PkgManagerMachine` when it begins linting.
 *
 * @event
 */
export type SmokeMachinePkgManagerLintBeginEvent = MachineEvent<
  typeof LintEvents.PkgManagerLintBegin,
  Omit<PkgManagerLintBeginEventData, ComputedPkgManagerLintFields>
>;

/**
 * Received from `PkgManagerMachine` when linting fails.
 *
 * @event
 */
export type SmokeMachinePkgManagerLintFailedEvent = MachineEvent<
  typeof LintEvents.PkgManagerLintFailed,
  Omit<PkgManagerLintFailedEventData, ComputedPkgManagerLintFields>
>;

/**
 * Received from `PkgManagerMachine` when linting succeeds.
 *
 * @event
 */
export type SmokeMachinePkgManagerLintOkEvent = MachineEvent<
  typeof LintEvents.PkgManagerLintOk,
  Omit<PkgManagerLintOkEventData, ComputedPkgManagerLintFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check begins.
 *
 * @event
 */
export type SmokeMachineRuleBeginEvent = MachineEvent<
  typeof LintEvents.RuleBegin,
  Omit<RuleBeginEventData, ComputedRuleEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check ends (regardless of
 * success or failure).
 *
 * @event
 */
export type SmokeMachineRuleEndEvent = MachineEvent<
  typeof LintEvents.RuleEnd,
  Omit<RuleEndEventData, ComputedRuleEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check throws an error.
 *
 * @event
 */
export type SmokeMachineRuleErrorEvent = MachineEvent<
  typeof LintEvents.RuleError,
  Omit<RuleErrorEventData, ComputedRuleEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check fails.
 *
 * @event
 */
export type SmokeMachineRuleFailedEvent = MachineEvent<
  typeof LintEvents.RuleFailed,
  Omit<RuleFailedEventData, ComputedRuleEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a rule check succeeds.
 *
 * @event
 */
export type SmokeMachineRuleOkEvent = MachineEvent<
  typeof LintEvents.RuleOk,
  Omit<RuleOkEventData, ComputedRuleEventFields>
>;
