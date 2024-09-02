import {AssertionError} from '#error/assertion-error';
import assert from 'node:assert';

export {AssertionError};

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
