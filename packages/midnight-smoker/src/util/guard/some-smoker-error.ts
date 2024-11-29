import {ErrorCode, type SmokerErrorName} from '#error/codes';
import {type SomeSmokerError} from '#error/some-smoker-error';
import {isError} from '#util/guard/common';

/**
 * Type guard for a `SmokerError`
 *
 * @param error Any value
 * @returns `true` if the value is an instance of class implementing
 *   `SmokerError`
 */

export const isSomeSmokerError = (error?: unknown): error is SomeSmokerError =>
  isError(error) &&
  'code' in error &&
  'name' in error &&
  ErrorCode[error.name as SmokerErrorName] === error.code;
