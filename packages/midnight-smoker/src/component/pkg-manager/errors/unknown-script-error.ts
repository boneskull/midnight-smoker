import {BaseSmokerError} from '../../../error/base-error';
import {instanceofSchema} from '../../../util';

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

/**
 * Represents the zod schema for a {@link UnknownScriptError} instance.
 */

export const zUnknownScriptError = instanceofSchema(UnknownScriptError);
