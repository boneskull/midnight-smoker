import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class MissingPackageJsonError extends BaseSmokerError<{
  cwd: string;
}> {
  public readonly name = 'MissingPackageJsonError';

  constructor(message: string, cwd: string) {
    super(message, {cwd});
  }
}
