import {BaseSmokerError} from './base-error';

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
