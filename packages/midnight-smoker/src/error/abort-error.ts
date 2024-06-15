import {BaseSmokerError} from '#error/base-error';
import {isErrnoException, isSmokerError} from '#util/error-util';
import Debug from 'debug';
import {isError} from 'lodash';

const debug = Debug('midnight-smoker:error:abort');

export class AbortError extends BaseSmokerError<
  {
    reason?: unknown;
    id?: string;
  },
  Error | undefined
> {
  public readonly id = 'AbortError';

  constructor(reason?: unknown, id?: string) {
    let msg = 'Aborted via signal';
    const reasonIsError = isError(reason);
    if (reason) {
      msg += '; reason: ';
      msg +=
        reasonIsError && 'message' in reason ? reason.message : String(reason);
    }
    const error = reasonIsError ? reason : undefined;
    super(msg, {reason, id}, error);
    if (id) {
      debug('%s: %s', id, msg);
    } else {
      debug(msg);
    }
  }
}

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
