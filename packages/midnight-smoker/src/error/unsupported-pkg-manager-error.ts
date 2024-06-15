import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class UnsupportedPackageManagerError extends BaseSmokerError<{
  desiredPkgManager: string;
}> {
  public readonly id = 'UnsupportedPackageManagerError';

  constructor(message: string, desiredPkgManager: string) {
    super(message, {desiredPkgManager});
  }
}
