import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class UnsupportedPackageManagerError extends BaseSmokerError<{
  name: string;
  version: string;
}> {
  public readonly id = 'UnsupportedPackageManagerError';
  constructor(message: string, name: string, version: string) {
    super(message, {name, version});
  }
}
