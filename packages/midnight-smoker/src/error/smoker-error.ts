import {type Jsonifiable} from 'type-fest';

import {ErrorCode, type SmokerErrorCode, type SmokerErrorName} from './codes';

/**
 * All `Error`s thrown by `midnight-smoker` should implement this interface.
 *
 * @template Context - Arbitrary per-exception-class data to attach to the
 *   error.
 * @template Cause - Usually an `Error`, which the implementation wraps
 */

export interface SmokerError<Context extends object | void = void, Cause = void>
  extends Error {
  /**
   * The error (usually an `Error`) that caused this error to be thrown.
   */
  cause?: Cause;

  /**
   * The error code.
   */
  code: SmokerErrorCode;

  /**
   * Arbitrary contextual data
   */
  context?: Context;

  /**
   * Like `toString()`, except fancy.
   *
   * @param verbose - If `true`, return more stuff (optional)
   */
  format(verbose?: boolean): string;

  formatCause?(verbose?: boolean): string;

  formatCode(verbose?: boolean): string;

  /**
   * Formats only the message. Called by {@link format}
   *
   * @param verbose - If `true`, return more stuff (optional)
   */
  formatMessage(verbose?: boolean): string;

  /**
   * Message!
   */
  message: string;

  /**
   * The name of the error.
   *
   * Should _usually_ be the same as `this.constructor.name`
   */
  name: SmokerErrorName;

  /**
   * If true, we should ask the user to submit a bug report.
   */
  shouldAskForBugReport?: boolean;

  /**
   * Returns the error in a JSON-serializable format.
   */
  toJSON(): StaticSmokerError;
}

/**
 * How a {@link SmokerError} appears in JSON.
 */
export type StaticSmokerError = {
  cause: Jsonifiable;
  code: SmokerErrorCode;
  context: Jsonifiable;
  errors?: Jsonifiable[];
  message: string;
  name: string;
  stack?: string;
};

/**
 * Lookup an error code for a given `SmokerError` subclass instance.
 *
 * Because this is used in {@link BaseSmokerError.constructor}, there is not yet
 * access to the `id` property of the subclass; otherwise we'd use that.
 *
 * @remarks
 * This probably has some implications around minification that I am not
 * worrying about.
 */

export function errorCodeFor(err: SmokerError<any, any>): SmokerErrorCode {
  const {name} = err.constructor;
  return ErrorCode[name as SmokerErrorName];
}
