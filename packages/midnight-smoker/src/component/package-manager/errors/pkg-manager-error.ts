import {BaseSmokerError} from '../../../error/base-error';
import type {PkgManagerSpec} from '../pkg-manager-spec';
/**
 * @group Errors
 */

export class PackageManagerError extends BaseSmokerError<
  {
    pkgManager: string;
  },
  Error
> {
  public readonly id = 'PackageManagerError';
  constructor(message: string, spec: string | PkgManagerSpec, error: Error) {
    super(message, {pkgManager: `${spec}`}, error);
  }
}
