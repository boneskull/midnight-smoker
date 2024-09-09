import {AbortError} from '#error/abort-error';
import {isErrnoException} from '#util/guard/errno-exception';
import {isSmokerError} from '#util/guard/smoker-error';
import {isError} from 'lodash';

/**
 * Returns `true` if the provided `error` is, in order of precedence:
 *
 * 1. An instance of {@link AbortError}
 * 2. An {@link NodeJS.ErrnoException} with a `code` of `'ABORT_ERROR'`
 * 3. An `Error` with a `name` of `'AbortError'`
 *
 * @param error Any value
 * @returns Whether `error` should be considered an "abort error"
 */

export function isAbortError(error: unknown): error is Error {
  return (
    isSmokerError(AbortError, error) ||
    (isErrnoException(error) && error.code === 'ABORT_ERROR') ||
    (isError(error) && error.name === 'AbortError')
  );
}
