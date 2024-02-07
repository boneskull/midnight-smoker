import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class UnreadablePackageJsonError extends BaseSmokerError<
  {
    pkgJsonPath: string;
  },
  Error
> {
  public readonly id = 'UnreadablePackageJsonError';

  constructor(message: string, pkgJsonPath: string, error: Error) {
    super(message, {pkgJsonPath}, error);
  }
}
