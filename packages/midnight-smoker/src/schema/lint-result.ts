import {type CheckOk, type CheckResult} from './check-result';
import type {LintManifest} from './lint-manifest';
import {type Result} from './workspaces';

export interface LintResultFailed extends Result<LintManifest> {
  type: 'FAILED';
  results: CheckResult[];
}

export interface LintResultOk extends Result<LintManifest> {
  type: 'OK';
  results: CheckOk[];
}

export type LintResult = LintResultFailed | LintResultOk;
