import {type FAILED, type OK} from '#constants';
import {type CheckResult, type CheckResultOk} from '#rule/check-result';
import {type LintManifest} from '#rule/lint-manifest';
import {type Result} from '#util/result';

export interface LintResultFailed extends Result<LintManifest> {
  results: CheckResult[];
  type: typeof FAILED;
}

export interface LintResultOk extends Result<LintManifest> {
  results: CheckResultOk[];
  type: typeof OK;
}

export type LintResult = LintResultFailed | LintResultOk;
