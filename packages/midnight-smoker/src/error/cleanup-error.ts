import {BaseSmokerError} from '#error/base-error';

/**
 * Thrown when `Smoker.cleanup()` fails.
 *
 * @group Errors
 *
 * TODO: remove this; no longer needed
 */

export class CleanupError extends BaseSmokerError<
  {
    dir: string;
  },
  Error
> {
  public readonly name = 'CleanupError';

  constructor(message: string, dir: string, error: Error) {
    super(message, {dir}, error);
  }
}
