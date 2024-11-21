import {type FAILED, type OK} from '#constants';
import {type StaticRule} from '#schema/lint/static-rule';
import {type Result} from '#util/result';

import {type StaticRuleContext} from './static-rule-context';

export interface CheckOk {
  ctx: Result<StaticRuleContext>;
  rule: StaticRule;
  type: typeof OK;
}

export interface Issue {
  ctx: Result<StaticRuleContext>;
  data?: unknown;
  error?: Error;
  filepath?: string;
  id: string;
  isError: boolean;
  jsonField?: string;
  localFilepath?: string;
  message: string;
  rule: StaticRule;
  type: typeof FAILED;
}

export type CheckResult = CheckOk | Issue;
