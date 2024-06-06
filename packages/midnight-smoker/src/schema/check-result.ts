import {type StaticRuleContext, type StaticRuleDef} from '#schema/rule-static';
import {type Result} from './workspaces';

export interface BaseCheckResult {
  rule: StaticRuleDef;
  ctx: Result<StaticRuleContext>;
}

export interface CheckOk extends BaseCheckResult {
  type: 'OK';
}

export interface CheckFailed extends BaseCheckResult {
  type: 'FAILED';
  id: string;
  message: string;
  isError: boolean;
  filepath?: string;
  data?: unknown;
  error?: Error;
}

export type CheckResult = CheckOk | CheckFailed;
