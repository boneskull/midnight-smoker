import {
  type SomeSmokerError,
  type SomeSmokerErrorClass,
} from '#error/some-smoker-error';
import {UnknownError} from '#error/unknown-error';
import {asValidationError, type ValidationError} from '#error/validation-error';
import * as assert from '#util/assert';
import {isError} from '#util/guard/common';
import {isSmokerError} from '#util/guard/smoker-error';
import {isSomeSmokerError} from '#util/guard/some-smoker-error';
import stringify from 'stringify-object';
import {type TupleToUnion} from 'type-fest';
import {ZodError} from 'zod';
import {
  isValidationErrorLike,
  type ValidationError as ZodValidationError,
} from 'zod-validation-error';

import {createDebug} from './debug';

/**
 * Asserts that the provided error is an instance of a class implementing
 * `SmokerError`.
 *
 * @template T Class implementing `SmokerError`
 * @param ctor Constructor of a class implementing `SmokerError`
 * @param error Error value
 */
export function assertSmokerError<T extends SomeSmokerErrorClass>(
  ctor: T,
  error: unknown,
): asserts error is InstanceType<T>;

/**
 * Asserts that the provided error is an instance of any provided class
 * implementing `SmokerError`.
 *
 * @template T One or more classes implementing `SmokerError`
 * @param ctors Constructor(s) of class(es) implementing `SmokerError`
 * @param error Error value
 */
export function assertSmokerError<
  T extends readonly [SomeSmokerErrorClass, ...SomeSmokerErrorClass[]],
>(ctor: T, error: unknown): asserts error is InstanceType<TupleToUnion<T>>;

export function assertSmokerError<
  T extends
    | readonly [SomeSmokerErrorClass, ...SomeSmokerErrorClass[]]
    | SomeSmokerErrorClass,
>(ctorOrCtors: T, error: unknown) {
  if (Array.isArray(ctorOrCtors)) {
    const ctors = ctorOrCtors as readonly [
      SomeSmokerErrorClass,
      ...SomeSmokerErrorClass[],
    ] &
      T;
    assert.ok(
      isSmokerError(ctors, error),
      `Expected one of: ${ctors.map((ctor) => ctor.name).join(', ')}`,
    );
  } else {
    const ctor = ctorOrCtors as SomeSmokerErrorClass & T;
    assert.ok(isSmokerError(ctor, error), `Expected ${ctor.name}`);
  }
}

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
  return new Error(stringify(err, {indent: '  '}));
}

const debug = createDebug(__filename);
