import type * as Schema from '#schema/meta/for-lint-events';

import {LintEvents} from '#constants/event';
import {type RuleError} from '#error/rule-error';
import {type Result} from '#util/result';

import {type PkgEventBase, type PkgManagerEventBase} from './common';

export {LintEvents};

/**
 * A mapping of lint event types to their data types
 */
export type LintEventData = {
  [LintEvents.LintBegin]: LintBeginEventData;
  [LintEvents.LintFailed]: LintFailedEventData;
  [LintEvents.LintOk]: LintOkEventData;
  [LintEvents.PkgLintBegin]: PkgLintBeginEventData;
  [LintEvents.PkgLintFailed]: PkgLintFailedEventData;
  [LintEvents.PkgLintOk]: PkgLintOkEventData;
  [LintEvents.PkgManagerLintBegin]: PkgManagerLintBeginEventData;
  [LintEvents.PkgManagerLintFailed]: PkgManagerLintFailedEventData;
  [LintEvents.PkgManagerLintOk]: PkgManagerLintOkEventData;
  [LintEvents.RuleBegin]: RuleBeginEventData;
  [LintEvents.RuleEnd]: RuleEndEventData;
  [LintEvents.RuleError]: RuleErrorEventData;
  [LintEvents.RuleFailed]: RuleFailedEventData;
  [LintEvents.RuleOk]: RuleOkEventData;
};

//#region PkgLint events
export type PkgLintEventBase = PkgEventBase;

export type PkgLintBeginEventData = PkgLintEventBase;

export type PkgLintOkEventData = {
  results: Schema.LintResultOk[];
} & PkgLintEventBase;

export type PkgLintFailedEventData = {
  results: Schema.LintResult[];
} & PkgLintEventBase;
//#endregion

//#region PkgManagerLint events
export type PkgManagerLintBeginEventData = PkgManagerLintEventBase;

export type PkgManagerLintEventBase = {
  totalRules: number;
} & PkgManagerEventBase;

export type PkgManagerLintFailedEventData = {
  results: Schema.LintResult[];
} & PkgManagerLintEventBase;

export type PkgManagerLintOkEventData = {
  results: Schema.LintResult[];
} & PkgManagerLintEventBase;
//#endregion

//#region Rule events
export type RuleEventDataBase = {
  config: Schema.SomeRuleConfig;
  manifest: Result<
    {
      workspace: Result<Schema.WorkspaceInfo>;
    } & Omit<Schema.LintManifest, 'workspace'>
  >;
  pkgManager: Schema.StaticPkgManagerSpec;
  rule: string;
  totalRules: number;
} & PkgLintEventBase;

export type RuleBeginEventData = RuleEventDataBase;

export type RuleFailedEventData = {
  result: Schema.CheckResultFailed[];
} & RuleEventDataBase;

export type RuleEndEventData = {
  error?: RuleError;
  result?: Schema.CheckOk | Schema.CheckResultFailed[];
} & RuleEventDataBase;

export type RuleErrorEventData = {
  error: RuleError;
} & RuleEventDataBase;

export type RuleOkEventData = {
  result: Schema.CheckOk;
} & RuleEventDataBase;
//#endregion

//#region Top-level lint events
export type LintEventDataBase = {
  config: Schema.BaseRuleConfigRecord;
  pkgManagers: Schema.StaticPkgManagerSpec[];
  totalRules: number;
  workspaceInfo: Result<Schema.WorkspaceInfo>[];
};

export type LintBeginEventData = LintEventDataBase;

export type LintOkEventData = {
  results: Schema.LintResultOk[];
} & LintEventDataBase;

export type LintFailedEventData = {
  results: Schema.LintResult[];
} & LintEventDataBase;
//#endregion
