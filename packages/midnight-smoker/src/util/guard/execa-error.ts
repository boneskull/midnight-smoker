import type {ExecaError} from 'execa';

import {ExecaErrorSchema} from '#schema/execa-error';

/**
 * Type guard for an {@link ExecaError}.
 *
 * If there was a class exported, that'd be better, but there ain't.
 *
 * @param error - Any value
 * @returns `true` if `error` is an {@link ExecaError}
 */

export function isExecaError(error: unknown): error is ExecaError {
  return ExecaErrorSchema.safeParse(error).success;
}
