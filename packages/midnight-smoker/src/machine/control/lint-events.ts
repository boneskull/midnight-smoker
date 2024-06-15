import type {
  PkgManagerLintBeginEventData,
  PkgManagerLintFailedEventData,
  PkgManagerLintOkEventData,
  RuleBeginEventData,
  RuleEndEventData,
  RuleErrorEventData,
  RuleFailedEventData,
  RuleOkEventData,
} from '#event/lint-events';
import type {MachineEvent} from '#machine/util';

export type ComputedPkgManagerLintFields = 'totalPkgManagers' | 'totalRules';

export type ComputedRuleEventFields = 'totalRules';

export type CtrlLintEvent =
  | CtrlPkgManagerLintBeginEvent
  | CtrlPkgManagerLintOkEvent
  | CtrlPkgManagerLintFailedEvent
  | CtrlRuleBeginEvent
  | CtrlRuleOkEvent
  | CtrlRuleFailedEvent
  | CtrlRuleEndEvent
  | CtrlRuleErrorEvent;

export type CtrlRuleEndEvent = MachineEvent<
  'LINT.RULE_END',
  Omit<RuleEndEventData, ComputedRuleEventFields>
>;

export type CtrlPkgManagerLintBeginEvent = MachineEvent<
  'LINT.PKG_MANAGER_LINT_BEGIN',
  Omit<PkgManagerLintBeginEventData, ComputedPkgManagerLintFields>
>;

export type CtrlPkgManagerLintFailedEvent = MachineEvent<
  'LINT.PKG_MANAGER_LINT_FAILED',
  Omit<PkgManagerLintFailedEventData, ComputedPkgManagerLintFields>
>;

export type CtrlPkgManagerLintOkEvent = MachineEvent<
  'LINT.PKG_MANAGER_LINT_OK',
  Omit<PkgManagerLintOkEventData, ComputedPkgManagerLintFields>
>;

export type CtrlRuleBeginEvent = MachineEvent<
  'LINT.RULE_BEGIN',
  Omit<RuleBeginEventData, ComputedRuleEventFields>
>;

export type CtrlRuleErrorEvent = MachineEvent<
  'LINT.RULE_ERROR',
  Omit<RuleErrorEventData, ComputedRuleEventFields>
>;

export type CtrlRuleFailedEvent = MachineEvent<
  'LINT.RULE_FAILED',
  Omit<RuleFailedEventData, ComputedRuleEventFields>
>;

export type CtrlRuleOkEvent = MachineEvent<
  'LINT.RULE_OK',
  Omit<RuleOkEventData, ComputedRuleEventFields>
>;
