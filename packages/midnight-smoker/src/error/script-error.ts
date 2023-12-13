import {bold, cyan, italic, magenta, yellow} from 'chalk';
import {format} from 'node:util';
import {BaseSmokerError} from './base-error';
import {ExecError} from './exec-error';

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
 * @group Errors
 */

export class RunScriptError extends BaseSmokerError<
  {
    script: string;
    pkgName: string;
    pkgManager: string;
    command: string;
    exitCode: number;
    output: string;
  },
  ExecError
> {
  public readonly id = 'RunScriptError';

  constructor(
    error: ExecError,
    script: string,
    pkgName: string,
    pkgManagerSpec: string,
  ) {
    const message = format(
      'Script %s in package %s failed with exit code %s',
      italic(magenta(script)),
      bold(cyan(pkgName)),
      yellow(error.exitCode),
    );
    super(
      message,
      {
        script,
        pkgName,
        pkgManager: pkgManagerSpec,
        command: error.command,
        exitCode: error.exitCode,
        output: error.all || error.stderr || error.stdout,
      },
      error,
    );
  }
}

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
 * @group Errors
 */
export class RunScriptBailed extends Error {}
/**
 * @group Errors
 */

export type ScriptError =
  | RunScriptError
  | UnknownScriptError
  | ScriptFailedError;
