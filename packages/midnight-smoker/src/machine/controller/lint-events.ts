import type {
  PkgManagerLintBeginEventData,
  PkgManagerLintFailedEventData,
  PkgManagerLintOkEventData,
  RuleBeginEventData,
  RuleErrorEventData,
  RuleFailedEventData,
  RuleOkEventData,
} from '#event';
import type {MachineEvent} from '#machine/util';

export type ComputedPkgManagerLintFields = 'totalPkgManagers' | 'totalRules';

export type ComputedRuleEventFields = 'totalRules';

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

export interface AnyLintEvent {
  type: 'LINT.*' &
    'LINT.PKG_MANAGER_LINT_BEGIN' &
    'LINT.PKG_MANAGER_LINT_FAILED' &
    'LINT.PKG_MANAGER_LINT_OK' &
    'LINT.RULE_BEGIN' &
    'LINT.RULE_ERROR' &
    'LINT.RULE_FAILED' &
    'LINT.RULE_OK';
}

export type CtrlLintEvents =
  | CtrlPkgManagerLintBeginEvent
  | CtrlPkgManagerLintOkEvent
  | CtrlPkgManagerLintFailedEvent
  | CtrlRuleBeginEvent
  | CtrlRuleOkEvent
  | CtrlRuleFailedEvent
  | CtrlRuleErrorEvent;
