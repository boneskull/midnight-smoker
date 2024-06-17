import {type LintEvent} from '#constants';
import {type RuleError} from '#error/rule-error';
import type * as Schema from '#schema/meta/for-lint-events';
import {type Result} from '#util/result';
import {type PkgManagerEventBase} from './common';

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
  results: Schema.LintResult[];
}

export interface PkgManagerLintOkEventData extends PkgManagerLintEventDataBase {
  results: Schema.LintResult[];
}

export interface RuleEventDataBase {
  manifest: Result<Schema.LintManifest>;
  rule: string;
  config: Schema.SomeRuleConfig;
  totalRules: number;
  pkgManager: Schema.StaticPkgManagerSpec;
}

export interface RuleBeginEventData extends RuleEventDataBase {}

export interface RuleFailedEventData extends RuleEventDataBase {
  result: Schema.CheckFailed[];
}

export interface RuleEndEventData extends RuleEventDataBase {
  result?: Schema.CheckFailed[] | Schema.CheckOk;
  error?: RuleError;
}

export interface RuleErrorEventData extends RuleEventDataBase {
  error: RuleError;
}

export interface RuleOkEventData extends RuleEventDataBase {
  result: Schema.CheckOk;
}

export interface LintEventDataBase {
  config: Schema.BaseRuleConfigRecord;
  totalRules: number;
  pkgManagers: Schema.StaticPkgManagerSpec[];
  workspaceInfo: Result<Schema.WorkspaceInfo>[];
}

export interface LintBeginEventData extends LintEventDataBase {}

export interface LintOkEventData extends LintEventDataBase {
  results: Schema.LintResultOk[];
}

export interface LintFailedEventData extends LintEventDataBase {
  results: Schema.LintResult[];
}
