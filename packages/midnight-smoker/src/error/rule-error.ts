import type {StaticRuleContext} from '../component/rule/static';
import {BaseSmokerError} from './base-error';

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
