/**
 * Provides {@link fromUnknownError} which converts anything to an `Error` (or
 * optionally an {@link UnknownError})
 *
 * @packageDocumentation
 */

import {type SomeSmokerError} from '#error/some-smoker-error';
import {UnknownError} from '#error/unknown-error';
import {asValidationError, type ValidationError} from '#error/validation-error';
import {isError} from '#util/guard/common';
import {isSomeSmokerError} from '#util/guard/some-smoker-error';
import {inspect} from 'node:util';
import {ZodError} from 'zod';
import {
  isValidationErrorLike,
  type ValidationError as ZodValidationError,
} from 'zod-validation-error';

import {createDebug} from './debug';

/**
 * Identity
 *
 * @template T Some `SmokerError`
 * @param error An object implementing `SmokerError`
 * @param wrap Ignored
 * @returns `err`
 */
export function fromUnknownError<T extends SomeSmokerError>(
  error?: T,
  wrap?: boolean,
): T;

/**
 * Converts a `ZodError` or `ZodValidationError` to a `ValidationError`.
 *
 * @template T Some {@link ZodError} or {@link ZodValidationError}
 * @param error Error object
 * @param wrap Ignored
 * @returns A {@link ValidationError}
 */
export function fromUnknownError<T extends ZodError | ZodValidationError>(
  error?: T,
  wrap?: boolean,
): ValidationError;

/**
 * Converts a value to an {@link UnknownError}
 *
 * `wrap` should be used if this error is known to not be contained within an
 * `AggregateError`.
 *
 * @param error Anything
 * @param wrap Enables wrapping in an {@link UnknownError}; must be `true`
 * @returns An `UnknownError`
 */
export function fromUnknownError(error: unknown, wrap: true): UnknownError;

/**
 * Converts a value to an {@link Error}
 *
 * @param error Value to be converted
 * @param wrap Disables wrapping in an {@link UnknownError}; cannot be `true`
 * @returns An {@link Error}
 */
export function fromUnknownError(error?: unknown, wrap?: false): Error;

export function fromUnknownError(err?: unknown, wrap = false) {
  if (isSomeSmokerError(err)) {
    return err;
  }
  if (err instanceof ZodError || isValidationErrorLike(err)) {
    return asValidationError(err);
  }
  debug('Saw an unknown exception: %O', err);
  if (wrap) {
    return new UnknownError(err);
  }
  if (isError(err)) {
    return err;
  }
  return new UnknownError(inspect(err, {sorted: true}));
}

const debug = createDebug(__filename);
