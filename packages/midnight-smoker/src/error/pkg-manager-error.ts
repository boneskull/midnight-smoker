import type {PkgManagerSpec} from '../component/pkg-manager/pkg-manager-spec';
import {BaseSmokerError} from './base-error';

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
