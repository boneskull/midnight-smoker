import {BaseSmokerError} from './base-error.js';

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
