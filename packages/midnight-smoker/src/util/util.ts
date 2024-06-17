/**
 * Gotta have a "util" module
 *
 * @packageDocumentation
 */

import {castArray as _castArray, compact, flow} from 'lodash';
import path from 'node:path';

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
 * Returns string representing difference between `startTime` and now _in
 * seconds_.
 *
 * @param startTime Start timestamp
 * @returns Delta
 */
export function delta(startTime: number): string {
  return ((performance.now() - startTime) / 1000).toFixed(2);
}

/**
 * Returns a relative path suitable for display (with leading `.` and
 * `path.sep`)
 *
 * @param value Path
 * @param cwd Path from which to make the path relative
 * @returns A relative path, prepended with a `.` and path separator
 */

export function hrRelativePath(value: string, cwd = process.cwd()): string {
  const relative = path.relative(cwd, value);
  return relative.startsWith('..') ? relative : `.${path.sep}${relative}`;
}
