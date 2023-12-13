import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class PackageManagerError extends BaseSmokerError<
  {
    spec: string;
  },
  Error
> {
  public readonly id = 'PackageManagerError';
  constructor(message: string, spec: string, error: Error) {
    super(message, {spec}, error);
  }
}
/**
 * @group Errors
 */

export class UnknownVersionError extends BaseSmokerError<{
  pm: string;
  version: string;
}> {
  public readonly id = 'UnknownVersionError';

  constructor(message: string, pm: string, version: string) {
    super(message, {pm, version});
  }
}
/**
 * @group Errors
 */
export class UnknownVersionRangeError extends BaseSmokerError<{
  pm: string;
  versionRange: string;
}> {
  public readonly id = 'UnknownVersionRangeError';
  constructor(message: string, pm: string, versionRange: string) {
    super(message, {pm, versionRange});
  }
}
/**
 * @group Errors
 */
export class UnknownDistTagError extends BaseSmokerError<{
  pkgName: string;
  tag: string;
}> {
  public readonly id = 'UnknownDistTagError';
  constructor(message: string, pkgName: string, tag: string) {
    super(message, {pkgName, tag});
  }
}
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
