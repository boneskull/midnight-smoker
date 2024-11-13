import type {SomeSmokerErrorClass} from '#error/some-smoker-error';
import type {TupleToUnion} from 'type-fest';

import {ErrorCode, type SmokerErrorName} from '#error/codes';
import {isError, isFunction} from '#util/guard/common';

/**
 * Returns `true` if the provided value is an instance of a class implementing
 * `SmokerError`.
 *
 * @template T Class implementing `SmokerError`
 * @param ctor Constructor of a class implementing `SmokerError`
 * @param error Error value
 * @returns `true` if `error` is an instance of `ctor`
 */

export function isSmokerError<T extends SomeSmokerErrorClass>(
  ctor: T,
  error: unknown,
): error is InstanceType<T>;

/**
 * Returns `true` if the provided value is an instance of any provided class
 * implementing `SmokerError`.
 *
 * @template T One or more classes implementing `SmokerError`
 * @param ctors Constructor(s) of class(es) implementing `SmokerError`
 * @param error Error value
 * @returns `true` if `error` is an instance of any of the provided classes in
 *   `ctors`
 */

export function isSmokerError<
  T extends readonly [SomeSmokerErrorClass, ...SomeSmokerErrorClass[]],
>(ctors: T, error: unknown): error is InstanceType<TupleToUnion<T>>;

export function isSmokerError<
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
    return ctors.some((ctor) => isSmokerError(ctor, error));
  }
  const ctor = ctorOrCtors as SomeSmokerErrorClass & T;
  return (
    isFunction(ctor) &&
    isError(error) &&
    (error instanceof ctor ||
      ('code' in error &&
        ErrorCode[ctor.name as SmokerErrorName] === error.code))
  );
}
