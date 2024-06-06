import {type RuleError} from '#error/rule-error';
import {type CheckFailed, type CheckOk} from '#schema/check-result';
import {type LintManifest} from '#schema/lint-manifest';
import {type LintResult, type LintResultOk} from '#schema/lint-result';
import {
  type BaseRuleConfigRecord,
  type SomeRuleConfig,
} from '#schema/rule-options';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type Result, type WorkspaceInfo} from '#schema/workspaces';
import {type LintEvent} from './event-constants';
import {type PkgManagerEventBase} from './pkg-manager-events';

export interface LintEventData {
  [LintEvent.PkgManagerLintBegin]: PkgManagerLintBeginEventData;
  [LintEvent.PkgManagerLintOk]: PkgManagerLintOkEventData;
  [LintEvent.PkgManagerLintFailed]: PkgManagerLintFailedEventData;
  [LintEvent.RuleBegin]: RuleBeginEventData;
  [LintEvent.RuleOk]: RuleOkEventData;
  [LintEvent.RuleFailed]: RuleFailedEventData;
  [LintEvent.RuleError]: RuleErrorEventData;
  [LintEvent.RuleEnd]: RuleEndEventData;
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
  manifest: Result<LintManifest>;
  rule: string;
  config: SomeRuleConfig;
  totalRules: number;
  pkgManager: StaticPkgManagerSpec;
}

export interface RuleBeginEventData extends RuleEventDataBase {}

export interface RuleFailedEventData extends RuleEventDataBase {
  result: CheckFailed[];
}

export interface RuleEndEventData extends RuleEventDataBase {
  result?: CheckFailed[] | CheckOk;
  error?: RuleError;
}

export interface RuleErrorEventData extends RuleEventDataBase {
  error: RuleError;
}

export interface RuleOkEventData extends RuleEventDataBase {
  result: CheckOk;
}

export interface LintEventDataBase {
  config: BaseRuleConfigRecord;
  totalRules: number;
  pkgManagers: StaticPkgManagerSpec[];
  workspaceInfo: Result<WorkspaceInfo>[];
}

export interface LintBeginEventData extends LintEventDataBase {}

export interface LintOkEventData extends LintEventDataBase {
  results: LintResultOk[];
}

export interface LintFailedEventData extends LintEventDataBase {
  results: LintResult[];
}
