/**
 * Assertions.
 *
 * Wraps a few functions in {@link node:assert} to throw custom
 * {@link AssertionError AssertionErrors}.
 *
 * @packageDocumentation
 */

import {AssertionError} from '#error/assertion-error';
import assert from 'node:assert';

export {AssertionError};

/**
 * Tests that a value is truthy
 *
 * @param value Some value
 * @param message Message to display if the value is falsy
 */
export function ok(
  value: unknown,
  message: string = 'Expected value to be truthy',
): asserts value {
  try {
    assert(value);
  } catch (err) {
    throw new AssertionError(message, err as assert.AssertionError);
  }
}

/**
 * Tests that a value is strictly equal to another
 *
 * @param actual Actual value
 * @param expected Expected value
 * @param message Message to display if the values are not equal
 */
export function equal<T>(
  actual: T,
  expected: T,
  message: string = 'Expected values to be equal',
): asserts actual is T {
  try {
    assert.strictEqual(actual, expected);
  } catch (err) {
    throw new AssertionError(
      message,
      actual,
      expected,
      err as assert.AssertionError,
    );
  }
}

export function deepEqual<T>(
  actual: T,
  expected: T,
  message: string = 'Expected values to be deeply equal',
): asserts actual is T {
  try {
    assert.deepStrictEqual(actual, expected);
  } catch (err) {
    throw new AssertionError(
      message,
      actual,
      expected,
      err as assert.AssertionError,
    );
  }
}
