import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class UnknownScriptError extends BaseSmokerError<
  {
    pkgName: string;
    script: string;
  },
  Error | undefined
> {
  public readonly name = 'UnknownScriptError';

  constructor(message: string, script: string, pkgName: string, error?: Error) {
    super(message, {pkgName, script}, error);
  }
}
