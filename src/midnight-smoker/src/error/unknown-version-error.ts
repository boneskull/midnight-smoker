import {BaseSmokerError} from './base-error.js';

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
