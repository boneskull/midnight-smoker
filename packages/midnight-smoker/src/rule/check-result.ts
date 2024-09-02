import {type FAILED, type OK} from '#constants';
import {type StaticRule} from '#schema/static-rule';
import {type Result} from '#util/result';

import {type StaticRuleContext} from './static-rule-context';

export interface BaseCheckResult {
  ctx: Result<StaticRuleContext>;
  rule: StaticRule;
}

export interface CheckResultOk extends BaseCheckResult {
  type: typeof OK;
}

export interface CheckResultFailed extends BaseCheckResult {
  data?: unknown;
  error?: Error;
  filepath?: string;
  id: string;
  isError: boolean;
  message: string;
  type: typeof FAILED;
}

export type CheckResult = CheckResultFailed | CheckResultOk;
