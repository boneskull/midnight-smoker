import {BaseSmokerError} from './base-error';

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
