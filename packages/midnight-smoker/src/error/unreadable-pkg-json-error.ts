import {BaseSmokerError} from '#error/base-error';

/**
 * @group Errors
 */

export class UnreadablePackageJsonError extends BaseSmokerError<
  {
    pkgJsonPath: string;
  },
  Error
> {
  public readonly name = 'UnreadablePackageJsonError';

  constructor(message: string, pkgJsonPath: string, error: Error) {
    super(message, {pkgJsonPath}, error);
  }
}
