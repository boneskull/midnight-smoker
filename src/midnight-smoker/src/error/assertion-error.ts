import {isError} from 'lodash';

import {BaseSmokerError} from './base-error.js';

/**
 * An error for assertions.
 *
 * This is not intended to be full-featured like other `AssertionError`
 * implementations; it prefers to wrap another `Error`.
 *
 * @group Errors
 */
export class AssertionError<T = void, U = void> extends BaseSmokerError<
  {
    actual: T;
    expected: U;
  } | void,
  Error | undefined
> {
  public readonly name = 'AssertionError';

  constructor(message: string, error?: Error);

  constructor(message: string, actual: T, expected: U, error?: Error);

  constructor(message: string, actual: Error | T, expected?: U, error?: Error) {
    const context = isError(actual)
      ? undefined
      : {actual, expected: expected as U};
    super(message, context, context ? error : (actual as Error));
  }
}
