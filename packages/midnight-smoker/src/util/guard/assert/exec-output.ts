import {AssertionError} from '#error/assertion-error';
import {asValidationError} from '#error/validation-error';
import {type ExecOutput, ExecOutputSchema} from '#schema/exec-result';

/**
 * Asserts given `value` is an {@link ExecResult}.
 *
 * @param value Any value
 */

export function assertExecOutput(value: unknown): asserts value is ExecOutput {
  try {
    ExecOutputSchema.parse(value);
  } catch (err) {
    const error = asValidationError(err, 'Not an ExecOutput object');
    throw new AssertionError(error.message, error);
  }
}
