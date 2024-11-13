/**
 * The junk drawer
 *
 * @packageDocumentation
 */
import * as R from 'remeda';
import {type CamelCase, type KebabCase} from 'type-fest';

/**
 * Casts a defined value to an array of non-`undefined` values.
 *
 * If `value` is `undefined`, returns an empty array. If `value` is an `Array`,
 * returns the compacted array. Otherwise, it wraps `value` in an array and
 * returns a compacted array (meaning a nullish `value` will result in an empty
 * array)
 *
 * @param value Any value
 * @returns An array, for sure!
 */
export const castArray = R.when(R.isArray, {
  onFalse: R.piped((v) => [v], R.filter(R.isTruthy)),
  onTrue: R.filter(R.isTruthy),
}) as <T>(value?: readonly T[] | T) => T[];

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
export type CamelCasedObject<T extends Record<string, unknown>> = {
  [K in keyof T as CamelCase<K> | K]: T[K];
};

/**
 * An object with keys transformed to kebab-case.
 *
 * @template T - The original object type.
 */
export type KebabCasedObject<T extends Record<string, unknown>> = {
  [K in keyof T as KebabCase<K>]: T[K];
};

/**
 * An object with keys transformed to dual casing (camel case and kebab case).
 *
 * @template T - The original object type.
 */
export type DualCasedObject<T extends Record<string, unknown>> =
  CamelCasedObject<T> & KebabCasedObject<T>;

/**
 * Creates a new object with the same keys as `obj`, but with each key
 * duplicated both as camelCase and kebab-case.
 *
 * For compat between `midconfig` and `yargs`
 *
 * @param obj - Any object
 * @returns New object with probably more keys
 */

export function toDualCasedObject<const T extends Record<string, unknown>>(
  obj: T,
): DualCasedObject<T> {
  return {
    ...R.mapKeys(obj, (key) => R.toCamelCase(key)),
    ...R.mapKeys(obj, (key) => R.toKebabCase(key)),
  } as DualCasedObject<T>;
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
