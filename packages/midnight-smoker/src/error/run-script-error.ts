import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {bold, cyan, italic, magenta, yellow} from 'chalk';
import {format} from 'node:util';
import {BaseSmokerError} from './base-error';
import type {ExecError} from './exec-error';

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
    pkgManager: string | StaticPkgManagerSpec,
  ) {
    const message = format(
      'Script %s in package %s failed with exit code %s',
      italic(magenta(script)),
      bold(cyan(pkgName)),
      yellow(error.exitCode),
    );
    if (typeof pkgManager === 'object') {
      pkgManager = `${pkgManager.pkgManager}@${pkgManager.version}`;
    }
    super(
      message,
      {
        script,
        pkgName,
        pkgManager,
        command: error.command,
        exitCode: error.exitCode,
        output: error.all || error.stderr || error.stdout,
      },
      error,
    );
  }
}
