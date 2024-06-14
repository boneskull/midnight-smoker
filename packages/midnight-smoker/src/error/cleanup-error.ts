import {BaseSmokerError} from './base-error';

/**
 * Thrown when `Smoker.cleanup()` fails.
 *
 * @group Errors
 */

export class CleanupError extends BaseSmokerError<
  {
    dir: string;
  },
  Error
> {
  public readonly id = 'CleanupError';

  constructor(message: string, dir: string, error: Error) {
    super(message, {dir}, error);
  }
}
