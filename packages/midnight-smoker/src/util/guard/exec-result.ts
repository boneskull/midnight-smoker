import {type ExecResult, ExecResultSchema} from '#schema/exec-result';

/**
 * Type guard for an {@link ExecResult}
 *
 * @param value Any value
 * @returns `true` if `value` is a valid {@link ExecResult}
 */

export function isExecResult(value: unknown): value is ExecResult {
  return ExecResultSchema.safeParse(value).success;
}
