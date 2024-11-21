import {BaseSmokerError} from '#error/base-error';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';
import {formatErrorMessage, formatPackage} from '#util/format';
import {italic, whiteBright, yellow} from 'chalk';
import {format} from 'node:util';

import {type ExecError} from './exec-error';

/**
 * A generic error thrown if a custom script fails, but we don't have a more
 * specific error.
 *
 * This is thrown by `midnight-smoker` itself
 *
 * @group Errors
 */
export class RunScriptError extends BaseSmokerError<
  {
    command?: string;
    exitCode?: number;
    output: string;
    pkgManager: string;
    pkgName: string;
    script: string;
  },
  ExecError
> {
  public readonly name = 'RunScriptError';

  constructor(
    error: ExecError,
    script: string,
    pkgName: string,
    pkgManager: StaticPkgManagerSpec | string,
  ) {
    const message = format(
      'Script %s in package %s failed with exit code %s',
      italic(whiteBright(script)),
      formatPackage(pkgName),
      yellow(error.exitCode),
    );
    if (typeof pkgManager === 'object') {
      pkgManager = pkgManager.label;
    }
    super(
      message,
      {
        command: error.command,
        exitCode: error.exitCode,
        output: error.stderr || error.stdout,
        pkgManager,
        pkgName,
        script,
      },
      error,
    );
  }

  public override formatMessage(verbose = false) {
    if (!verbose) {
      return super.formatMessage(verbose);
    }
    return format(
      '%s\n%s\n\n%s\n%s\n\n%s\n%s',
      whiteBright(italic('Message:')),
      formatErrorMessage(this.message),
      whiteBright(italic('Command:')),
      this.context.command,
      whiteBright(italic('Output:')),
      this.context.output,
    );
  }
}
