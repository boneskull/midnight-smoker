import type {StaticCheckContext, StaticRuleDef} from './rule';

export interface CheckResult {
  rule: StaticRuleDef;
  context: StaticCheckContext;
  failed: boolean;
}

/**
 * @todo add better location, somehow
 */
export interface CheckResultData {
  filename?: string;
  [key: string]: any;
}

export interface CheckFailure extends CheckResult {
  message: string;
  data?: CheckResultData;
  failed: true;
}

export interface CheckOk extends CheckResult {
  failed: false;
}

export interface CheckResults {
  failed: CheckFailure[];
  passed: CheckOk[];
}
