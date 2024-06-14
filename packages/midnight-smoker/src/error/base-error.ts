import {italic, white, whiteBright, yellow} from 'chalk';
import Debug from 'debug';
import {format, formatWithOptions} from 'node:util';
import stringify from 'stringify-object';
import type {SmokerErrorCode, SmokerErrorId} from './codes';
import {ErrorCodes} from './codes';

export const debug = Debug('midnight-smoker:error');

/**
 * Lookup an error code for a given `SmokerError` subclass instance.
 *
 * Because this is used in {@link BaseSmokerError.constructor}, there is not yet
 * access to the `id` property of the subclass; otherwise we'd use that.
 *
 * @remarks
 * This probably has some implications around minification that I am not
 * worrying about.
 * @throws {ReferenceError} - If the subclass is missing from the `ErrorCodes`.
 *   Note that this will throw _during_ the instantiation of an `Error` about to
 *   be thrown.
 */
export function getErrorCode(err: SmokerError<any, any>): SmokerErrorCode {
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
    public readonly context: Context,
    public override readonly cause?: Cause,
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

export type SomeSmokerError = SmokerError<any, any>;
