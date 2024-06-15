import {type LintManifest} from '#schema/lint-manifest';
import {type SomeRuleConfig} from '#schema/rule-options';
import {type Result} from '#util/result';
import {type Simplify} from 'type-fest';
import {BaseSmokerError} from './base-error';

export type RuleErrorContext = Simplify<
  Result<LintManifest> & {
    config: SomeRuleConfig;
    ruleId: string;
  }
>;

/**
 * @group Errors
 */

export class RuleError extends BaseSmokerError<RuleErrorContext, Error> {
  public readonly id = 'RuleError';
}
