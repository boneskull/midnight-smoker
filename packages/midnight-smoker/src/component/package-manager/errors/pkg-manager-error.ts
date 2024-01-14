import {BaseSmokerError} from '../../../error/base-error';

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
