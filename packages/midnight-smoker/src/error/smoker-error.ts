/**
 * Errors unique to the `Smoker` class.
 *
 * @packageDocumentation
 */

import {AggregateSmokerError, BaseSmokerError} from './base-error';

/**
 * Thrown when `Smoker.cleanup()` fails.
 *
 * @group Errors
 */
export class CleanupError extends BaseSmokerError<
  {
    dir: string;
  },
  NodeJS.ErrnoException
> {
  public readonly id = 'CleanupError';
  constructor(message: string, dir: string, error: NodeJS.ErrnoException) {
    super(message, {dir}, error);
  }
}
/**
 * Thrown when _anything_ in `Smoker.smoke()` fails.
 *
 * @group Errors
 */
export class SmokeFailedError<T> extends AggregateSmokerError<{
  results?: T;
}> {
  public readonly id = 'SmokeFailedError';
  constructor(
    message: string,
    errors: Error[] | Error,
    {results}: {results?: T} = {},
  ) {
    super(message, errors, {results});
  }
}
