import {ok} from './assert';

/**
 * A non-empty array
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Type guard for a {@link NonEmptyArray non-empty array}
 *
 * @param value Any array
 * @returns `true` if `value` is a non-empty array
 * @todo Move this into schema-util maybe
 */

export function isNonEmptyArray<T>(
  value?: readonly T[] | T[],
): value is NonEmptyArray<T> {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Asserts `value` is a {@link NonEmptyArray non-empty array}
 *
 * @param value Any array
 * @param message Custom message in case of assertion failure
 * @todo Move this into schema-util maybe
 */

export function assertNonEmptyArray<T>(
  value: T[],
  message = 'Expected a non-empty array',
): asserts value is NonEmptyArray<T> {
  ok(isNonEmptyArray(value), message);
}
