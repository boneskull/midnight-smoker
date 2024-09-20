import {BaseSmokerError} from '#error/base-error';

/**
 * @group Errors
 */
export class UnknownVersionRangeError extends BaseSmokerError<{
  pm: string;
  versionRange: string;
}> {
  public readonly name = 'UnknownVersionRangeError';

  constructor(message: string, pm: string, versionRange: string) {
    super(message, {pm, versionRange});
  }
}
