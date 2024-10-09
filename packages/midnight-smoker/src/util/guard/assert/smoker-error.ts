import type {SomeSmokerErrorClass} from '#error/some-smoker-error';

import {ok} from '#util/assert';
import {isSmokerError} from '#util/guard/smoker-error';
import {type TupleToUnion} from 'type-fest';

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
    ok(
      isSmokerError(ctors, error),
      `Expected one of: ${ctors.map((ctor) => ctor.name).join(', ')}`,
    );
  } else {
    const ctor = ctorOrCtors as SomeSmokerErrorClass & T;
    ok(isSmokerError(ctor, error), `Expected ${ctor.name}`);
  }
}
