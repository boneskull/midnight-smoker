import {type FAILED, type OK} from '#constants';
import {type StaticRule} from '#schema/lint/static-rule';

import {type StaticRuleContext} from './static-rule-context';

export interface CheckOk {
  ctx: StaticRuleContext;
  rule: StaticRule;
  type: typeof OK;
}

export interface Issue {
  ctx: StaticRuleContext;
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
