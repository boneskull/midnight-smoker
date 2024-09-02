import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export type ScriptFailedContext = {
  command: string;
  exitCode: number;
  output: string;
  pkgManager: string;
  pkgName: string;
  script: string;
};

export class ScriptFailedError extends BaseSmokerError<
  ScriptFailedContext,
  Error | undefined
> {
  public readonly name = 'ScriptFailedError';
}
