import {BaseSmokerError} from '../../error/base-error';
import type {StaticRuleContext} from '../rule/static';

/**
 * @group Errors
 */

export class RuleError extends BaseSmokerError<
  {
    context: StaticRuleContext;
    ruleId: string;
  },
  Error
> {
  public readonly id = 'RuleError';
  constructor(
    message: string,
    context: StaticRuleContext,
    ruleId: string,
    error: Error,
  ) {
    super(message, {context, ruleId}, error);
  }
}
