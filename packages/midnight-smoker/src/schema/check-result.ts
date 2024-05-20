import {type StaticRuleContext, type StaticRuleDef} from '#schema/rule-static';

export interface BaseCheckResult {
  rule: StaticRuleDef;
  ctx: StaticRuleContext;
}

export interface CheckResultOk extends BaseCheckResult {
  type: 'OK';
}

export interface CheckResultFailed extends BaseCheckResult {
  type: 'FAILED';
  id: string;
  message: string;
  failed: boolean;
  filepath?: string;
  data?: unknown;
  error?: Error;
}

export type CheckResult = CheckResultOk | CheckResultFailed;
