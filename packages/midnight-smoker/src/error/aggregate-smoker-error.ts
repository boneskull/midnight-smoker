import {BaseSmokerError} from '#error/base-error';
import {fromUnknownError} from '#util/error-util';
import {DOUBLE_NL, indent, joinLines} from '#util/format';
import {isSomeSmokerError} from '#util/guard/some-smoker-error';
import {jsonify} from '#util/jsonify';
import {castArray} from '#util/util';

import {type SmokerErrorCode, type SmokerErrorName} from './codes';
import {
  errorCodeFor,
  type SmokerError,
  type StaticSmokerError,
} from './smoker-error';

/**
 * Base class for all aggregate exceptions thrown by `midnight-smoker`.
 *
 * This should only be used if _multiple_ errors are being collected--not just
 * catching some `Error` then throwing our own; use `BaseSmokerError` for that.
 *
 * @template Context - Arbitrary per-exception-class data to attach to the
 *   error.
 * @group Errors
 */

export abstract class AggregateSmokerError<Context extends object | void = void>
  extends AggregateError
  implements SmokerError<Context, Error | undefined>
{
  public override readonly cause?: Error;

  public readonly code: SmokerErrorCode;

  public readonly context?: Context;

  /**
   * @privateRemarks
   * Why doesn't the {@link AggregateError} constructor set this value?
   */
  public override errors: Error[];

  public override message: string;

  constructor(message: string, errors?: Error | Error[], context?: Context) {
    const errs = castArray(errors).map((err) => fromUnknownError(err));
    super(errs, message);
    this.message = message;
    this.context = context ?? undefined;
    this.errors = errs;
    this.code = errorCodeFor(this);
    if (errs.length === 1) {
      this.cause = errs[0];
    }
  }

  public format(verbose = false) {
    const output = BaseSmokerError.prototype.format.call(this, verbose);
    const aggregateOutput = this.cause
      ? []
      : this.errors.map((error) =>
          isSomeSmokerError(error)
            ? error.format(verbose)
            : BaseSmokerError.prototype.format.call(error, verbose),
        );
    return joinLines([output, ...indent(aggregateOutput)], DOUBLE_NL);
  }

  public formatCause() {
    return BaseSmokerError.prototype.formatCause.call(this);
  }

  public formatCode() {
    return BaseSmokerError.prototype.formatCode.call(this);
  }

  public formatMessage(verbose?: boolean): string {
    return BaseSmokerError.prototype.formatMessage.call(this, verbose);
  }

  public toJSON(): StaticSmokerError {
    const context = jsonify(this.context);
    const cause = jsonify(this.cause);
    const errors = this.errors.map(jsonify);

    return {
      cause,
      code: this.code,
      context,
      errors,
      message: this.message,
      name: this.name,
      stack: this.stack,
    };
  }

  public abstract override readonly name: SmokerErrorName;
}
