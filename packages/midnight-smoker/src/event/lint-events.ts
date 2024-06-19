import {type LintEvents} from '#constants';
import {type RuleError} from '#error/rule-error';
import type * as Schema from '#schema/meta/for-lint-events';
import {type Result} from '#util/result';
import {type Merge} from 'type-fest';
import {type PkgManagerEventBase} from './common';

export interface LintEventData {
  [LintEvents.PkgManagerLintBegin]: PkgManagerLintBeginEventData;
  [LintEvents.PkgManagerLintOk]: PkgManagerLintOkEventData;
  [LintEvents.PkgManagerLintFailed]: PkgManagerLintFailedEventData;
  [LintEvents.RuleBegin]: RuleBeginEventData;
  [LintEvents.RuleOk]: RuleOkEventData;
  [LintEvents.RuleFailed]: RuleFailedEventData;
  [LintEvents.RuleError]: RuleErrorEventData;
  [LintEvents.RuleEnd]: RuleEndEventData;
  [LintEvents.LintBegin]: LintBeginEventData;
  [LintEvents.LintOk]: LintOkEventData;
  [LintEvents.LintFailed]: LintFailedEventData;
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
  manifest: Result<
    Merge<Schema.LintManifest, {workspace: Result<Schema.WorkspaceInfo>}>
  >;
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
