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
