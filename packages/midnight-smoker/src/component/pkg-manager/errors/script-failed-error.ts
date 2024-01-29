import {BaseSmokerError} from '../../../error/base-error';
import {instanceofSchema} from '../../../util';

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

/**
 * Represents the zod schema for a {@link ScriptFailedError} instance.
 */

export const zScriptFailedError = instanceofSchema(ScriptFailedError);
