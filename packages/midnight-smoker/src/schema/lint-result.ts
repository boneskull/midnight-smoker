import {type CheckResult, type CheckResultOk} from './check-result';
import type {LintManifest} from './lint-manifest';

export interface LintResultFailed extends LintManifest {
  type: 'FAILED';
  results: CheckResult[];
}

export interface LintResultOk extends LintManifest {
  type: 'OK';
  results: CheckResultOk[];
}

export type LintResult = LintResultFailed | LintResultOk;
