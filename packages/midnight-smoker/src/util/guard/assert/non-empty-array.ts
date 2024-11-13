import {ok} from '#util/assert';
import {isNonEmptyArray, type NonEmptyArray} from '#util/guard/non-empty-array';

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
