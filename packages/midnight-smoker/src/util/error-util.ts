import {type SmokerError, type SomeSmokerError} from '#error/base-error';
import {ExecaErrorSchema} from '#schema/execa-error';
import Debug from 'debug';
import {type ExecaError} from 'execa';
import {isError} from 'lodash';
import assert from 'node:assert';
import {type Class, type TupleToUnion} from 'type-fest';
import type {ZodError} from 'zod-validation-error';

const debug = Debug('midnight-smoker:util:error-util');

/**
 * Type guard for {@link NodeJS.ErrnoException}
 *
 * @param value - Any value
 * @returns `true` if `value` is an {@link NodeJS.ErrnoException}
 */
export function isErrnoException(
  value: unknown,
): value is NodeJS.ErrnoException {
  return isError(value) && 'code' in value;
}

export function isSmokerError<
  T extends [Class<SomeSmokerError>, ...Class<SomeSmokerError>[]],
>(ctors: T, error: unknown): error is InstanceType<TupleToUnion<T>>;

export function isSmokerError<T extends Class<SomeSmokerError>>(
  ctor: T,
  error: unknown,
): error is InstanceType<T>;

export function isSmokerError<
  T extends
    | Class<SomeSmokerError>
    | [Class<SomeSmokerError>, ...Class<SomeSmokerError>[]],
>(ctorOrCtors: T, error: unknown) {
  if (Array.isArray(ctorOrCtors)) {
    return ctorOrCtors.some((ctor) => isSmokerError(ctor, error));
  }
  return isError(error) && (error as SmokerError).id === ctorOrCtors.name;
}

export function assertSmokerError<T extends Class<SomeSmokerError>>(
  ctor: T,
  error: unknown,
): asserts error is InstanceType<T>;

export function assertSmokerError<
  T extends [Class<SomeSmokerError>, ...Class<SomeSmokerError>[]],
>(ctor: T, error: unknown): asserts error is InstanceType<TupleToUnion<T>>;

export function assertSmokerError<T extends Class<SomeSmokerError>>(
  ctorOrCtors: T,
  error: unknown,
) {
  assert.ok(isSmokerError(ctorOrCtors, error));
}

/**
 * Type guard for an {@link ExecaError}.
 *
 * If there was a class exported, that'd be better, but there ain't.
 *
 * @param error - Any value
 * @returns `true` if `error` is an {@link ExecaError}
 */

export function isExecaError(error: unknown): error is ExecaError {
  return ExecaErrorSchema.safeParse(error).success;
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

export function fromUnknownError(err?: unknown): Error {
  if (isError(err)) {
    return err;
  }
  debug('Handling unknown error: %o', err);
  return new Error(`Unknown error: ${err}`);
}
