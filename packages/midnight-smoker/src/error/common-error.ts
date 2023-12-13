/**
 * Some "common" errors tossed around throughout the codebase.
 *
 * @packageDocumentation
 */

import {ValidationError, ZodError, fromZodError} from 'zod-validation-error';
import {BaseSmokerError, isZodError} from './base-error';

/**
 * Thrown when an invalid or missing argument is provided to a function.
 *
 * Generally, this sort of thing should be handled by Zod when interfacing with
 * user-provided code. It's mostly for contributors to `midnight-smoker`
 * itself.
 *
 * @group Errors
 */
export class InvalidArgError extends BaseSmokerError<
  {
    argName?: string;
    position?: number;
  },
  ValidationError | void
> {
  public readonly id = 'InvalidArgError';

  constructor(
    message: string | ZodError,
    {argName, position}: {argName?: string; position?: number} = {},
  ) {
    let err: ValidationError | undefined;
    // TODO: make sure we get a reasonable stack
    if (isZodError(message)) {
      err = fromZodError(message);
      message = err.message;
    }
    super(message, {argName, position}, err);
  }
}

/**
 * Thrown when some stub code gets hit.
 *
 * In a perfect world, this should never be used. But this is not a perfect
 * world because I am so, so tired.
 *
 * @group Errors
 */
export class NotImplementedError extends BaseSmokerError {
  public readonly id = 'NotImplementedError';
}

/**
 * Like a {@link ReferenceError}, but with an error code.
 *
 * @group Errors
 */
export class SmokerReferenceError extends BaseSmokerError {
  public readonly id = 'SmokerReferenceError';
}
