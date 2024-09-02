import {ExecError} from '#error/exec-error';
import {type ExecResult} from '#schema/exec-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {fromUnknownError} from '#util/error-util';
import {formatPackage, formatPkgManager} from '#util/format';
import {isExecResult} from '#util/guard/exec-result';
import {isExecaError} from '#util/guard/execa-error';
import {isSmokerError} from '#util/guard/smoker-error';

import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class InstallError extends BaseSmokerError<
  {
    cwd: string;
    originalMessage: string;
    pkgManager: StaticPkgManagerSpec;
    pkgSpec: string;
    result?: ExecResult;
  },
  Error | ExecError | undefined
> {
  public readonly name = 'InstallError';

  constructor(
    message: string,
    pkgManager: StaticPkgManagerSpec,
    pkgSpec: string,
    cwd: string,
    rawResult: unknown,
  ) {
    let error: Error | ExecError | undefined;
    let result: ExecResult | undefined;

    if (isExecaError(rawResult)) {
      error = isSmokerError(ExecError, rawResult)
        ? rawResult
        : new ExecError(rawResult);
    } else if (!isExecResult(rawResult)) {
      error = fromUnknownError(rawResult);
    } else {
      result = rawResult;
    }
    super(
      `${pkgManager.label} failed to install "${pkgSpec}" in dir ${cwd}`,
      {
        cwd,
        originalMessage: message.trim(),
        pkgManager,
        pkgSpec,
        result,
      },
      error,
    );
  }

  public override formatMessage(_verbose?: boolean): string {
    return `${formatPkgManager(
      this.context.pkgManager,
    )} failed to install package ${formatPackage(this.context.pkgSpec)}: ${
      this.context.originalMessage
    }`;
  }
}
