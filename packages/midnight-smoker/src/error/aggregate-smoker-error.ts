import {isZodError} from '#util/error-util';
import {castArray} from '#util/util';
import {fromZodError} from 'zod-validation-error';
import {BaseSmokerError, getErrorCode, type SmokerError} from './base-error';
import type {SmokerErrorCode, SmokerErrorId} from './codes';

/**
 * Base class for all aggregate exceptions thrown by `midnight-smoker`.
 *
 * This should only be used if _multiple_ errors are being collected--not just
 * catching some `Error` then throwing our own; use {@link BaseSmokerError} for
 * that.
 *
 * @template Context - Arbitrary per-exception-class data to attach to the
 *   error.
 * @group Errors
 */

export abstract class AggregateSmokerError<Context extends object | void = void>
  extends AggregateError
  implements SmokerError<Context>
{
  public override readonly cause?: void;

  public readonly context?: Context;

  public readonly code: SmokerErrorCode;

  public abstract readonly id: SmokerErrorId;

  /**
   * @privateRemarks
   * Why doesn't the {@link AggregateError} constructor set this value?
   */
  public override errors: Error[];

  constructor(message: string, errors?: Error[] | Error, context?: Context) {
    const errs = castArray(errors).map((err) =>
      isZodError(err) ? fromZodError(err) : err,
    );
    super(errs, message);
    this.context = context ?? undefined;
    this.errors = errs;
    this.code = getErrorCode(this);
  }

  public format(verbose = false) {
    return BaseSmokerError.prototype.format.call(this, verbose);
  }

  public toJSON() {
    return {
      message: this.message,
      id: this.id,
      stack: this.stack,
      context: this.context,
      code: this.code,
      errors: this.errors,
    };
  }
}
