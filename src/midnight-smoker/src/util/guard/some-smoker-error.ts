import {ErrorCode, type SmokerErrorName} from '#error/codes';
import {type SomeSmokerError} from '#error/some-smoker-error';
import {isError} from 'lodash';

/**
 * Type guard for a `SmokerError`
 *
 * @param error Any value
 * @returns `true` if the value is an instance of class implementing
 *   `SmokerError`
 */

export function isSomeSmokerError(error?: unknown): error is SomeSmokerError {
  return (
    isError(error) &&
    'code' in error &&
    'name' in error &&
    ErrorCode[error.name as SmokerErrorName] === error.code
  );
}
