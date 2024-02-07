import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class DirCreationError extends BaseSmokerError<
  {prefix: string},
  NodeJS.ErrnoException
> {
  public readonly id = 'DirCreationError';

  constructor(message: string, prefix: string, error: NodeJS.ErrnoException) {
    super(message, {prefix}, error);
  }
}
