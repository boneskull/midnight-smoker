import {italic, white, whiteBright, yellow} from 'chalk';
import {isError} from 'lodash';
import {format, formatWithOptions} from 'node:util';
import stringify from 'stringify-object';
import type {ZodError} from 'zod-validation-error';
import {fromZodError} from 'zod-validation-error';
import {castArray} from '../schema-util';
import type {SmokerErrorCode, SmokerErrorId} from './codes';
import {ErrorCodes} from './codes';

/**
 * Lookup an error code for a given `SmokerError` subclass instance.
 *
 * @throws {ReferenceError} - If the subclass is missing from the `ErrorCodes`.
 *   Note that this will throw _during_ the instantiation of an `Error` about to
 *   be thrown.
 */
function getErrorCode(err: SmokerError<any, any>): SmokerErrorCode {
  const {name} = err.constructor;
  if (!(name in ErrorCodes)) {
    throw new ReferenceError(`${name} missing an error code`);
  }
  return ErrorCodes[name as SmokerErrorId];
}

/**
 * Base class for all non-aggregate exceptions thrown by `midnight-smoker`.
 *
 * @template Context - Arbitrary per-exception-class data to attach to the
 *   error.
 * @template Cause - Any caught exception that caused this error to be
 *   instantiated & thrown.
 * @group Errors
 */
export abstract class BaseSmokerError<
    Context extends object | void = void,
    Cause extends Error | void = void,
  >
  extends Error
  implements SmokerError<Context, Cause>
{
  public readonly code: SmokerErrorCode;
  public abstract readonly id: SmokerErrorId;
  constructor(
    message: string,
    public readonly context?: Context,
    public readonly cause?: Cause,
  ) {
    super(message);
    this.code = getErrorCode(this);
  }

  public format(verbose = false) {
    const cause = stringify(this.cause, {indent: '  '});

    if (verbose) {
      return format(
        '%s %s\n\n%s\n%s\n\n%s\n%s',
        yellow(this.message),
        `${white('(')}${whiteBright(this.code)}${white(')')}`,
        whiteBright(italic('Script Context:')),
        cause,
        whiteBright(italic('Stack Trace:')),
        formatWithOptions({colors: true, compact: false}, '%O', this),
      );
    }
    return format(
      '%s %s',
      yellow(this.message),
      `${white('(')}${whiteBright(this.code)}${white(')')}`,
    );
  }

  public toJSON() {
    return {
      message: this.message,
      context: this.context,
      id: this.id,
      stack: this.stack,
      cause: this.cause,
      code: this.code,
    };
  }
}

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
    this.context = context;
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

/**
 * Options for {@link SmokerError} with a generic `Cause` type for `cause` prop.
 */
export interface SmokerError<
  Context extends object | void = void,
  Cause extends Error | void = void,
> extends Error {
  cause?: Cause;

  /**
   * Arbitrary contextual data
   */
  context?: Context;
  /**
   * The error code.
   */
  code: SmokerErrorCode;
  /**
   * The name of the error.
   *
   * Should _usually_ be the same as `this.constructor.name`
   */
  id: SmokerErrorId;
  /**
   * Message!
   */
  message: string;
  /**
   * Like `toString()`, except fancy.
   *
   * @param verbose - If `true`, return more stuff.
   */
  format(verbose?: boolean): string;

  /**
   * Returns the error in a JSON-serializable format.
   */
  toJSON(): object;
}

/**
 * Checks if the provided error is an instance of `ZodError`.
 *
 * @param value - The value to check.
 * @returns `true` if the error is a `ZodError`, `false` otherwise.
 */
export function isZodError(value: unknown): value is ZodError {
  return isError(value) && value.name === 'ZodError';
}

/**
 * Converts something that was thrown to an `Error` instance, if not already.
 *
 * @param err - A thrown thing
 * @returns The original thing (if an `Error`) otherwise a new `Error`
 */
export function fromUnknownError(err: unknown): Error {
  return isError(err) ? err : new Error(`Unknown error: ${err}`);
}
