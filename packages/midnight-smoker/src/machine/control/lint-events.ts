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
import {type Simplify} from 'type-fest';

export type ComputedPkgManagerLintFields = 'totalPkgManagers' | 'totalRules';

export type ComputedRuleEventFields = 'totalRules';

export type CtrlLintEvents =
  | CtrlPkgManagerLintBeginEvent
  | CtrlPkgManagerLintOkEvent
  | CtrlPkgManagerLintFailedEvent
  | CtrlRuleBeginEvent
  | CtrlRuleOkEvent
  | CtrlRuleFailedEvent
  | CtrlRuleEndEvent
  | CtrlRuleErrorEvent;

export type CtrlRuleEndEvent = Simplify<
  MachineEvent<'LINT.RULE_END', Omit<RuleEndEventData, ComputedRuleEventFields>>
>;

export type CtrlPkgManagerLintBeginEvent = Simplify<
  MachineEvent<
    'LINT.PKG_MANAGER_LINT_BEGIN',
    Omit<PkgManagerLintBeginEventData, ComputedPkgManagerLintFields>
  >
>;

export type CtrlPkgManagerLintFailedEvent = Simplify<
  MachineEvent<
    'LINT.PKG_MANAGER_LINT_FAILED',
    Omit<PkgManagerLintFailedEventData, ComputedPkgManagerLintFields>
  >
>;

export type CtrlPkgManagerLintOkEvent = Simplify<
  MachineEvent<
    'LINT.PKG_MANAGER_LINT_OK',
    Omit<PkgManagerLintOkEventData, ComputedPkgManagerLintFields>
  >
>;

export type CtrlRuleBeginEvent = Simplify<
  MachineEvent<
    'LINT.RULE_BEGIN',
    Omit<RuleBeginEventData, ComputedRuleEventFields>
  >
>;

export type CtrlRuleErrorEvent = Simplify<
  MachineEvent<
    'LINT.RULE_ERROR',
    Omit<RuleErrorEventData, ComputedRuleEventFields>
  >
>;

export type CtrlRuleFailedEvent = Simplify<
  MachineEvent<
    'LINT.RULE_FAILED',
    Omit<RuleFailedEventData, ComputedRuleEventFields>
  >
>;

export type CtrlRuleOkEvent = Simplify<
  MachineEvent<'LINT.RULE_OK', Omit<RuleOkEventData, ComputedRuleEventFields>>
>;
