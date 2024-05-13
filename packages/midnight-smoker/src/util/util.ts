/**
 * Gotta have a "util" module
 *
 * @packageDocumentation
 */

import {memoize as _memoize, once as _once, isFunction, isObject} from 'lodash';
import type {Opaque} from 'type-fest';

/**
 * A branded string referring to a unique identifier.
 */
export type UniqueId = Opaque<string, 'UniqueId'>;

/**
 * A function which generates a {@link UniqueId}
 */
export type UniqueIdFactory = () => UniqueId;

/**
 * Returns a {@link UniqueIdFactory}, which generates a unique ID each time it is
 * called.
 *
 * @param prefix - A prefix to prepend to each ID
 * @returns The unique ID factory, which makes this function factory factory.
 */
export function uniqueIdFactoryFactory(prefix = ''): UniqueIdFactory {
  let nextId = 0;

  return function generateId(): UniqueId {
    return `${prefix}${nextId++}` as UniqueId;
  };
}

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
>(resolver?: (...args: TArgs) => any) {
  return function (
    target: (this: TThis, ...args: TArgs) => TReturn,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassMethodDecoratorContext<
      TThis,
      (this: TThis, ...args: TArgs) => TReturn
    >,
  ) {
    return _memoize(target, resolver);
  };
}
