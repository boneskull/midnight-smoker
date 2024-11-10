import {type ExecOutput, ExecOutputSchema} from '#schema/exec-output';

/**
 * Type guard for an {@link ExecResult}
 *
 * @param value Any value
 * @returns `true` if `value` is a valid {@link ExecResult}
 */
export function isExecOutput(value: unknown): value is ExecOutput {
  return ExecOutputSchema.safeParse(value).success;
}
