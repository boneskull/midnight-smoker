import {
  fromZodError,
  type ValidationError,
  type ZodError,
} from 'zod-validation-error';
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
