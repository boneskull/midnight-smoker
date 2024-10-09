import {BaseSmokerError} from '#error/base-error';
import {fromUnknownError} from '#util/from-unknown-error';

/**
 * This exception is thrown when a process fails to spawn.
 *
 * @remarks
 * Should be thrown by an `ExecFn` implementation
 * @group Errors
 */

export class SpawnError extends BaseSmokerError<void, Error> {
  public readonly name = 'SpawnError';

  constructor(message: string, error: unknown) {
    const err = fromUnknownError(error);
    super(message, undefined, err);
  }
}
