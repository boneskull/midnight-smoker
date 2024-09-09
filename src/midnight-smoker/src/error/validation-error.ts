import {
  toValidationError as zodToValidationError,
  ValidationError as ZodValidationError,
} from 'zod-validation-error';

import {BaseSmokerError} from './base-error.js';
import {ErrorCode} from './codes.js';
import {type SmokerError} from './smoker-error.js';

/**
 * Converts any value to a `ValidationError` (`zod-validation-error`).
 */
const toValidationError = zodToValidationError();

export class ValidationError
  extends ZodValidationError
  implements SmokerError<{summary?: string}, unknown>
{
  public readonly code = ErrorCode.ZodValidationError;

  public context: {summary?: string};

  public readonly error: Error;

  // @ts-expect-error - overwrites prop
  public override readonly name = 'ValidationError';

  constructor(error: unknown, summary?: string) {
    const validationError = toValidationError(error);
    super(validationError.message, validationError.details);
    this.error = validationError;
    this.context = {summary};
  }

  public static create(this: void, error: unknown, summary?: string) {
    return new ValidationError(error, summary);
  }

  public format(verbose = false) {
    return BaseSmokerError.prototype.format.call(this, verbose);
  }

  public formatCode(verbose?: boolean): string {
    return BaseSmokerError.prototype.formatCode.call(this, verbose);
  }

  public formatMessage(verbose?: boolean): string {
    return BaseSmokerError.prototype.formatMessage.call(this, verbose);
  }

  public toJSON() {
    return BaseSmokerError.prototype.toJSON.call(this);
  }
}

export const asValidationError = ValidationError.create;
