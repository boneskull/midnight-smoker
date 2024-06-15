import {type Result} from '#util/result';
import {type CheckOk, type CheckResult} from './check-result';
import type {LintManifest} from './lint-manifest';

export interface LintResultFailed extends Result<LintManifest> {
  type: 'FAILED';
  results: CheckResult[];
}

export interface LintResultOk extends Result<LintManifest> {
  type: 'OK';
  results: CheckOk[];
}

export type LintResult = LintResultFailed | LintResultOk;
