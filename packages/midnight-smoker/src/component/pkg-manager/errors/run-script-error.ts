import {bold, cyan, italic, magenta, yellow} from 'chalk';
import {format} from 'node:util';
import {BaseSmokerError} from '../../../error/base-error';
import {instanceofSchema} from '../../../util';
import type {ExecError} from '../../executor/exec-error';
import type {PkgManagerSpec} from '../pkg-manager-spec';

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
    pkgManager: string | PkgManagerSpec,
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
        pkgManager: `${pkgManager}`,
        command: error.command,
        exitCode: error.exitCode,
        output: error.all || error.stderr || error.stdout,
      },
      error,
    );
  }
}

/**
 * Represents the zod schema for a {@link RunScriptError} instance.
 */

export const zRunScriptError = instanceofSchema(RunScriptError);
