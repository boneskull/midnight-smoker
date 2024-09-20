import {BaseSmokerError} from '#error/base-error';

/**
 * @group Errors
 */
export class UnsupportedPackageManagerError extends BaseSmokerError<{
  desiredPkgManager: string;
}> {
  public readonly name = 'UnsupportedPackageManagerError';

  constructor(message: string, desiredPkgManager: string) {
    super(message, {desiredPkgManager});
  }
}
