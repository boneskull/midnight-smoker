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
  flow,
} from 'lodash';
import {type Result, type WorkspaceInfo} from '../pkg-manager';

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
}

/**
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

export const castArray = flow(_castArray, compact);

/**
 * Picks a random item from a non-empty list
 *
 * @param items List of items
 * @returns Some item
 */
export function randomItem<T>(items: [T, ...T[]] | readonly [T, ...T[]]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

/**
 * Converts an object extending {@link WorkspaceInfo} to a {@link Result},
 * suitable for serialization
 *
 * @param obj Any object extending {@link WorkspaceInfo}
 * @returns A {@link Result} object
 */
export function asResult<T extends WorkspaceInfo>(obj: T): Result<T> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const result: Result<T> = {...obj} as any;
  delete result.pkgJson;
  return result;
}

/**
 * Returns string representing difference between `startTime` and now _in
 * seconds_.
 *
 * @param startTime Start timestamp
 * @returns Delta
 */
export function delta(startTime: number): string {
  return ((performance.now() - startTime) / 1000).toFixed(2);
}
