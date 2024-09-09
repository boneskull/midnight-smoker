import {BaseSmokerError} from './base-error.js';

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
  public readonly name = 'CleanupError';

  constructor(message: string, dir: string, error: Error) {
    super(message, {dir}, error);
  }
}
