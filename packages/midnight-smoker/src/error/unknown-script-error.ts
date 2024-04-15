import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class UnknownScriptError extends BaseSmokerError<{
  script: string;
  pkgName: string;
}> {
  public readonly id = 'UnknownScriptError';

  constructor(message: string, script: string, pkgName: string) {
    super(message, {script, pkgName});
  }
}
