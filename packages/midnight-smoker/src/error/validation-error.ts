import {BaseSmokerError} from '#error/base-error';
import {isString} from '#util/guard/common';
import {
  toValidationError as zodToValidationError,
  ValidationError as ZodValidationError,
} from 'zod-validation-error';

import {ErrorCode} from './codes';
import {type SmokerError} from './smoker-error';

/**
 * Converts any value to a `ValidationError` (`zod-validation-error`).
 */
const toValidationError = zodToValidationError();

export interface ValidationErrorContext {
  original?: unknown;
  summary?: string;
}

export class ValidationError
  extends ZodValidationError
  implements SmokerError<ValidationErrorContext, unknown>
{
  public readonly code = ErrorCode.ValidationError;

  public context: ValidationErrorContext;

  public readonly error: Error;

  // @ts-expect-error - overwrites prop
  public override readonly name = 'ValidationError';

  constructor(
    error: unknown,
    {original, summary}: ValidationErrorContext = {},
  ) {
    const validationError = toValidationError(error);
    super(validationError.message, validationError.details);
    this.error = validationError;
    this.context = {original, summary};
  }

  public static create(
    this: void,
    error: unknown,
    summary?: string | ValidationErrorContext,
    original?: unknown,
  ) {
    return new ValidationError(
      error,
      isString(summary) ? {original, summary} : summary,
    );
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
