import {BaseSmokerError} from '#error/base-error';
import {fromUnknownError} from '#util/error-util';

/**
 * This exception is thrown when a process fails to spawn.
 *
 * @group Errors
 */

export class SpawnError extends BaseSmokerError<void, Error> {
  public readonly name = 'SpawnError';

  constructor(message: string, error: unknown) {
    const err = fromUnknownError(error);
    super(message, undefined, err);
  }
}
