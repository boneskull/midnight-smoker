import type {RuleError} from '#error';
import type {
  BaseNormalizedRuleOptions,
  BaseNormalizedRuleOptionsRecord,
  LintManifest,
  LintResult,
  LintResultOk,
  RuleResultFailed,
  RuleResultOk,
  StaticPkgManagerSpec,
} from '../component';
import type {LintEvent} from './event-constants';
import type {PkgManagerEventBase} from './pkg-manager-events';

export interface LintEventData {
  [LintEvent.PkgManagerLintBegin]: PkgManagerLintBeginEventData;
  [LintEvent.PkgManagerLintOk]: PkgManagerLintOkEventData;
  [LintEvent.PkgManagerLintFailed]: PkgManagerLintFailedEventData;
  [LintEvent.RuleBegin]: RuleBeginEventData;
  [LintEvent.RuleOk]: RuleOkEventData;
  [LintEvent.RuleFailed]: RuleFailedEventData;
  [LintEvent.RuleError]: RuleErrorEventData;
  [LintEvent.LintBegin]: LintBeginEventData;
  [LintEvent.LintOk]: LintOkEventData;
  [LintEvent.LintFailed]: LintFailedEventData;
}

export interface PkgManagerLintBeginEventData
  extends PkgManagerLintEventDataBase {}

export interface PkgManagerLintEventDataBase extends PkgManagerEventBase {
  totalRules: number;
}

export interface PkgManagerLintFailedEventData
  extends PkgManagerLintEventDataBase {
  results: LintResult[];
}

export interface PkgManagerLintOkEventData extends PkgManagerLintEventDataBase {
  results: LintResult[];
}

export interface RuleEventDataBase {
  manifest: LintManifest;
  rule: string;
  config: BaseNormalizedRuleOptions;
  totalRules: number;
  pkgManager: StaticPkgManagerSpec;
}

export interface RuleBeginEventData extends RuleEventDataBase {}

export interface RuleFailedEventData extends RuleEventDataBase {
  result: RuleResultFailed[];
}

export interface RuleErrorEventData extends RuleEventDataBase {
  error: RuleError;
}

export interface RuleOkEventData extends RuleEventDataBase {
  result: RuleResultOk;
}

export interface LintEventDataBase {
  config: BaseNormalizedRuleOptionsRecord;
  totalRules: number;
  totalPkgManagers: number;
  totalUniquePkgs: number;
}

export interface LintBeginEventData extends LintEventDataBase {}

export interface LintOkEventData extends LintEventDataBase {
  results: LintResultOk[];
}

export interface LintFailedEventData extends LintEventDataBase {
  results: LintResult[];
}
