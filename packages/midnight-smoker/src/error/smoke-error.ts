/**
 * Errors unique to the `Smoker` class.
 *
 * @packageDocumentation
 */
import {castArray} from '#util/util';
import {italic} from 'chalk';
import pluralize from 'pluralize';

import {AggregateSmokerError} from './aggregate-smoker-error';

/**
 * Thrown when _anything_ in `Smoker.smoke()` fails.
 *
 * @group Errors
 */
export class SmokeError extends AggregateSmokerError {
  public override readonly name = 'SmokeError';

  constructor(errors: Error | Error[]) {
    const errs =
      errors instanceof AggregateSmokerError
        ? errors.errors
        : castArray(errors);
    super(
      `Aborted due to ${pluralize(
        'unrecoverable error',
        errs.length,
      )}. Bummer!`,
      errs,
    );
  }

  public override formatMessage(verbose?: boolean): string {
    let msg = super.formatMessage(verbose);
    if (!verbose) {
      msg += italic`\n  (Try again with --verbose for more details)`;
    }
    return msg;
  }
}
