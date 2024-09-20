import {BaseSmokerError} from '#error/base-error';
import {type ZodError} from 'zod';

import {ValidationError} from './validation-error';

/**
 * @group Errors
 */

export class InvalidPkgJsonError extends BaseSmokerError<
  {pkgJsonPath: string},
  ValidationError
> {
  public override readonly cause: ValidationError;

  public readonly name = 'InvalidPkgJsonError';

  constructor(message: string, error: ZodError, pkgJsonPath: string) {
    const err = new ValidationError(error);
    super(message, {pkgJsonPath}, err);
    this.cause = err;
  }
}
