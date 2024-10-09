import {BaseSmokerError} from '#error/base-error';

/**
 * @group Errors
 */

export type ScriptFailedContext = {
  command?: string;
  exitCode: number;
  output: string;
  pkgManager: string;
  pkgName: string;
  script: string;
};

/**
 * The error that is thrown when a custom script runs but fails (typically with
 * a non-zero exit code).
 *
 * `PkgManager`s should throw this.
 *
 * @group Errors
 */
export class ScriptFailedError extends BaseSmokerError<
  ScriptFailedContext,
  Error | undefined
> {
  public readonly name = 'ScriptFailedError';
}
