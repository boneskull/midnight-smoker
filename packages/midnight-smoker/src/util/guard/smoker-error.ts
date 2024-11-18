/**
 * Provides guards to check if a value is a `SmokerError` or has a specific
 * error code.
 */

import type {SomeSmokerErrorClass} from '#error/some-smoker-error';
import type {TupleToUnion} from 'type-fest';

import {
  ErrorCode,
  type SmokerErrorCode,
  type SmokerErrorName,
} from '#error/codes';
import {isError, isFunction} from '#util/guard/common';

/**
 * Returns `true` if the provided value is an instance of a class implementing
 * `SmokerError`.
 *
 * @template T Class implementing `SmokerError`
 * @template U Mapping of error names to error codes
 * @param ctor Constructor of a class implementing `SmokerError`
 * @param error Error value
 * @returns `true` if `error` is an instance of `ctor`
 */

export function isSmokerError<
  T extends SomeSmokerErrorClass,
  const U extends Record<string, string> = typeof ErrorCode,
>(ctor: T, error: unknown, codes?: U): error is InstanceType<T>;

/**
 * Returns `true` if the provided value is an instance of any provided class
 * implementing `SmokerError`.
 *
 * @template T One or more classes implementing `SmokerError`
 * @template U Mapping of error names to error codes
 * @param ctors Constructor(s) of class(es) implementing `SmokerError`
 * @param error Error value
 * @returns `true` if `error` is an instance of any of the provided classes in
 *   `ctors`
 */

export function isSmokerError<
  T extends readonly [SomeSmokerErrorClass, ...SomeSmokerErrorClass[]],
  const U extends Record<string, string> = typeof ErrorCode,
>(ctors: T, error: unknown, codes?: U): error is InstanceType<TupleToUnion<T>>;

/**
 * @privateRemarks
 * This function should **not** use `instanceof` checks.
 */
export function isSmokerError<
  T extends
    | readonly [SomeSmokerErrorClass, ...SomeSmokerErrorClass[]]
    | SomeSmokerErrorClass,
  const U extends Record<string, string> = typeof ErrorCode,
>(ctorOrCtors: T, error: unknown, codes?: U) {
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
    hasErrorCode(error, ErrorCode[ctor.name as SmokerErrorName], codes)
  );
}

/**
 * Type guard for an error containing either a specific error code or any valid
 * error code.
 *
 * @template T Error type
 * @template U Error code type
 * @template V Mapping of error names to error codes
 * @param error Error to check
 * @param code Error code to match, if desired
 * @param codes Optional mapping of error names to error codes
 * @returns `true` if `error` has the specified error code
 */
export const hasErrorCode = <
  T extends Error,
  const U extends string = SmokerErrorCode,
  const V extends Record<string, string> = typeof ErrorCode,
>(
  error: T,
  code?: U,
  codes?: V,
): error is {code: U} & T => {
  const errorCodes = codes ?? ErrorCode;
  const name = error.name as SmokerErrorName;
  return (
    error.name in errorCodes &&
    (code ? errorCodes[name] === code : !!errorCodes[name])
  );
};
