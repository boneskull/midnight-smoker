import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export type ScriptFailedContext = {
  script: string;
  pkgName: string;
  pkgManager: string;
  command: string;
  exitCode: number;
  output: string;
};

export class ScriptFailedError extends BaseSmokerError<
  ScriptFailedContext,
  Error | undefined
> {
  public readonly id = 'ScriptFailedError';
}
