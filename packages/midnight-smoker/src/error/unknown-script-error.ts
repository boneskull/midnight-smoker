import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class UnknownScriptError extends BaseSmokerError<
  {
    script: string;
    pkgName: string;
  },
  Error | undefined
> {
  public readonly id = 'UnknownScriptError';

  constructor(message: string, script: string, pkgName: string, error?: Error) {
    super(message, {script, pkgName}, error);
  }
}
