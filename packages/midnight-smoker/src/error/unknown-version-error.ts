import {BaseSmokerError} from '#error/base-error';

/**
 * @group Errors
 */

export class UnknownVersionError extends BaseSmokerError<{
  pm: string;
  version: string;
}> {
  public readonly name = 'UnknownVersionError';

  constructor(message: string, pm: string, version: string) {
    super(message, {pm, version});
  }
}
