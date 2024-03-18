import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 * @todo Add underlying error to `cause`
 */

export class ScriptFailedError extends BaseSmokerError<{
  script: string;
  pkgName: string;
  pkgManager: string;
  command: string;
  exitCode: number;
  output: string;
}> {
  public readonly id = 'ScriptFailedError';
}
