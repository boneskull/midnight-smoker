import pluralize from 'pluralize';
import {AggregateSmokerError} from './base-error';
import {type UnsupportedPackageManagerError} from './unsupported-pkg-manager-error';

/**
 * @group Errors
 */
export class AggregateUnsupportedPkgManagerError extends AggregateSmokerError {
  public readonly id = 'AggregateUnsupportedPkgManagerError';

  constructor(errors: UnsupportedPackageManagerError[]) {
    const specs = errors.map(({context}) => {
      if (!context) {
        return 'unknown';
      }
      const {name, version} = context;
      return `${name}@${version}`;
    });
    const message = `Failed to find ${pluralize(
      'implementation',
      errors.length,
    )} for ${pluralize('package manager', errors.length, true)}: ${specs.join(
      ', ',
    )}`;
    super(message, errors);
  }
}
