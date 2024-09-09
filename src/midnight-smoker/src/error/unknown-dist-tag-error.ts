import {BaseSmokerError} from './base-error.js';

/**
 * @group Errors
 */
export class UnknownDistTagError extends BaseSmokerError<{
  pkgName: string;
  tag: string;
}> {
  public readonly name = 'UnknownDistTagError';

  constructor(message: string, pkgName: string, tag: string) {
    super(message, {pkgName, tag});
  }
}
