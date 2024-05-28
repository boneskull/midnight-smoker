/**
 * Gotta have a "util" module
 *
 * @packageDocumentation
 */

import {
  castArray as _castArray,
  memoize as _memoize,
  once as _once,
  compact,
  isFunction,
  isObject,
  type Many,
} from 'lodash';

export interface Serializable<T = unknown> {
  toJSON(): T;
}

/**
 * Type guard for an object with a `toJSON` method.
 *
 * @param value Any value
 * @returns - `true` if `value` is an object with a `toJSON` method
 */
export function isSerializable<T, U = unknown>(
  value: T,
): value is T & Serializable<U> {
  return isObject(value) && 'toJSON' in value && isFunction(value.toJSON);
}

/**
 * This is just the identity if `T` is not serializable.
 *
 * @param value - The value to be serialized.
 * @returns The original value.
 */
export function serialize<T>(value: T): T;

/**
 * Serializes a value to JSON-able if it is serializable.
 *
 * This should be used where we have a `ThingOne` and a `ThingTwo implements
 * ThingOne` and `ThingTwo.toJSON()` returns a `ThingOne`, and we want the
 * `ThingOne` only. Yes, this is a convention.
 *
 * @param value - The value to be serialized.
 * @returns The serialized value if it is serializable, otherwise the original
 *   value.
 */
export function serialize<T extends Serializable<U>, U = unknown>(value: T): U;

export function serialize<T>(value: T) {
  if (isSerializable(value)) {
    return value.toJSON();
  }
  return value;
}

export function once<This, Args extends any[], TReturn>(
  target: (this: This, ...args: Args) => TReturn,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => TReturn
  >,
) {
  const onceTarget = _once(target);
  return function (this: This, ...args: Args): TReturn {
    return onceTarget.call(this, ...args);
  };
}

export type NonEmptyArray<T> = [T, ...T[]];

export function isNonEmptyArray<T>(value: T[]): value is NonEmptyArray<T> {
  return value.length > 0;
}

export function assertNonEmptyArray<T>(
  value: T[],
): asserts value is NonEmptyArray<T> {
  if (!isNonEmptyArray(value)) {
    throw new Error('Expected a non-empty array');
  }
}

/**
 * Memoization decorator
 *
 * @param resolver Function to return the cache key
 * @returns The decorator
 */
export function memoize<
  TThis extends object,
  TArgs extends any[] = unknown[],
  TReturn = unknown,
>(resolver?: (this: TThis, ...args: TArgs) => any) {
  return function (
    target: (this: TThis, ...args: TArgs) => TReturn,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassMethodDecoratorContext<
      TThis,
      (this: TThis, ...args: TArgs) => TReturn
    >,
  ) {
    context.addInitializer(function (this: TThis) {
      const func = context.access.get(this);
      // @ts-expect-error blah
      this[context.name] = _memoize(func, resolver);
    });
  };
} /**
 * Casts a defined value to an array of non-`undefined` values.
 *
 * If `value` is `undefined`, returns an empty array. If `value` is an `Array`,
 * returns the compacted array. Otherwise, returns an array with `value` as the
 * only element.
 *
 * This differs from {@link _castArray _.castArray} in that it refuses to put
 * `undefined` values within the array.
 *
 * @param value Any value
 * @returns An array, for sure!
 */

export function castArray<T>(value?: Many<T>): T[] {
  return compact(_castArray(value));
}
