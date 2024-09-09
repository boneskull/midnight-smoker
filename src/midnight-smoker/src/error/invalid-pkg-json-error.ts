import {type ZodError} from 'zod';

import {BaseSmokerError} from './base-error.js';
import {ValidationError} from './validation-error.js';

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
