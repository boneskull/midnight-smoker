import {LintManifest} from '#schema/lint-manifest';
import {StaticRuleContext, StaticRuleDef} from '#schema/rule-static';

export interface BaseLintResult {
  rule: StaticRuleDef;
  ctx: StaticRuleContext;
}

export interface RuleResultOk extends BaseLintResult {
  type: 'OK';
}

export interface RuleResultFailed extends BaseLintResult {
  type: 'FAILED';
  id: string;
  message: string;
  failed: boolean;
  filepath?: string;
  data?: unknown;
  error?: Error;
}

export type RuleResult = RuleResultOk | RuleResultFailed;

export interface LintResultFailed extends LintManifest {
  type: 'FAILED';
  results: RuleResult[];
}

export interface LintResultOk extends LintManifest {
  type: 'OK';
  results: RuleResultOk[];
}

export type LintResult = LintResultFailed | LintResultOk;
