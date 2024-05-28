/**
 * Errors unique to the `Smoker` class.
 *
 * @packageDocumentation
 */

import {type LintResult} from '#schema/lint-result';
import {type RunScriptResult} from '#schema/run-script-result';
import {castArray} from '#util/util';
import {AggregateSmokerError} from './base-error';

/**
 * Thrown when _anything_ in `Smoker.smoke()` fails.
 *
 * @group Errors
 */
export class SmokeError extends AggregateSmokerError<{
  lint?: LintResult[];
  script?: RunScriptResult[];
}> {
  public readonly id = 'SmokeError';

  constructor(
    errors: Error[] | Error,
    {
      lint,
      script,
    }: {
      lint?: LintResult[];
      script?: RunScriptResult[];
    } = {},
  ) {
    super('🤮 Maurice!', castArray(errors), {lint, script});
  }

  /**
   * Clone this instance with additional errors and options.
   *
   * @param error Zero or more errors to append to the aggregate
   * @param options Results of linting and running scripts, if any
   * @returns New instance of `SmokeError` with the given errors and options
   */
  clone(
    error: Error | Error[] = [],
    {
      lint,
      script,
    }: {
      lint?: LintResult[];
      script?: RunScriptResult[];
    } = {},
  ): SmokeError {
    return new SmokeError([...this.errors, ...castArray(error)], {
      lint,
      script,
    });
  }
}
