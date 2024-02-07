import {type SmokerError} from '#error';
import {ExecaErrorSchema} from '#schema/execa-error.js';
import {type ExecaError} from 'execa';
import {isError} from 'lodash';
import {type Class} from 'type-fest';

/**
 * Type guard for {@link NodeJS.ErrnoException}
 *
 * @param value - Any value
 * @returns `true` if `value` is an {@link NodeJS.ErrnoException}
 */
export function isErrnoException(
  value: unknown,
): value is NodeJS.ErrnoException {
  return isError(value) && 'code' in value;
}

export function isSmokerError<T extends Class<SmokerError<any, any>>>(
  ctor: T,
  error: unknown,
): error is InstanceType<T> {
  return isError(error) && (error as SmokerError).id === ctor.name;
}

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
