import {StaticRuleContext} from '../component/rule/static';
import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class RuleError extends BaseSmokerError<
  {
    context: StaticRuleContext;
    ruleName: string;
  },
  Error
> {
  public readonly id = 'RuleError';
  constructor(
    message: string,
    context: StaticRuleContext,
    ruleName: string,
    error: Error,
  ) {
    super(message, {context, ruleName}, error);
  }
}
