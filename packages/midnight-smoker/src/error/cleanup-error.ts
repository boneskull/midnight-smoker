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
  NodeJS.ErrnoException
> {
  public readonly id = 'CleanupError';

  constructor(message: string, dir: string, error: NodeJS.ErrnoException) {
    super(message, {dir}, error);
  }
}
