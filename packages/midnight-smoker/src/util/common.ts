/**
 * The junk drawer
 *
 * @packageDocumentation
 */

import {
  castArray as _castArray,
  camelCase,
  compact,
  flow,
  kebabCase,
  mapKeys,
} from 'lodash';
import {type CamelCase, type KebabCase} from 'type-fest';

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
 * Returns string representing difference between `startTime` and now in
 * seconds.
 *
 * @param startTime Start timestamp
 * @returns Delta
 */
export function delta(startTime: number): string {
  return ((performance.now() - startTime) / 1000).toFixed(2);
}

/**
 * An object with keys transformed to camelCase.
 */
export type CamelCasedObject<T> = {
  [K in keyof T as CamelCase<K> | K]: T[K];
};

/**
 * An object with keys transformed to kebab-case.
 *
 * @template T - The original object type.
 */
export type KebabCasedObject<T> = {
  [K in keyof T as KebabCase<K>]: T[K];
};

/**
 * An object with keys transformed to dual casing (camel case and kebab case).
 *
 * @template T - The original object type.
 */
export type DualCasedObject<T> = CamelCasedObject<T> & KebabCasedObject<T>;

/**
 * Creates a new object with the same keys as `obj`, but with each key
 * duplicated both as camelCase and kebab-case.
 *
 * For compat between `midconfig` and `yargs`
 *
 * @param obj - Any object
 * @returns New object with probably more keys
 */

export function toDualCasedObject<const T extends object>(
  obj: T,
): DualCasedObject<T> {
  return {
    ...(mapKeys(obj, (_, key) => camelCase(key)) as CamelCasedObject<T>),
    ...(mapKeys(obj, (_, key) => kebabCase(key)) as KebabCasedObject<T>),
  };
}

/**
 * Compares two strings case-insensitively.
 *
 * @param a First string
 * @param b Second string
 * @returns `true` if the strings are equal, ignoring case
 */
export function caseInsensitiveEquals(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
