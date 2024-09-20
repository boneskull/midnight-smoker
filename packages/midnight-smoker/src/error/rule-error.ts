import {BaseSmokerError} from '#error/base-error';
import {type LintManifest} from '#rule/lint-manifest';
import {type SomeRuleConfig} from '#schema/rule-options';
import {fromUnknownError} from '#util/error-util';
import {type Result} from '#util/result';
import {type Simplify} from 'type-fest';

/**
 * Context for a {@link RuleError}
 */
export type RuleErrorContext = Simplify<
  {
    config: SomeRuleConfig;
    ruleId: string;
  } & Result<LintManifest>
>;

/**
 * An error which occurred during the `check` method of a `Rule`
 *
 * @group Errors
 */

export class RuleError extends BaseSmokerError<RuleErrorContext, Error> {
  public readonly name = 'RuleError';

  constructor(message: string, context: RuleErrorContext, error: unknown) {
    const err = fromUnknownError(error);
    super(message, context, err);
  }
}
