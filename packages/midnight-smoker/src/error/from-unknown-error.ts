import Debug from 'debug';
import {isError} from 'lodash';

const debug = Debug('midnight-smoker:error:from-unknown-error');

/**
 * Converts something that was thrown to an `Error` instance, if not already.
 *
 * @param err - A thrown thing
 * @returns The original thing (if an `Error`) otherwise a new `Error`
 */

export function fromUnknownError(err?: unknown): Error {
  if (isError(err)) {
    return err;
  }
  debug('Handling unknown error: %o', err);
  return new Error(`Unknown error: ${err}`);
}
