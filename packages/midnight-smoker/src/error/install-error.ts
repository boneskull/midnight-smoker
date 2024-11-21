import {BaseSmokerError} from '#error/base-error';
import {ExecError} from '#error/exec-error';
import {type ExecOutput} from '#schema/exec/exec-output';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';
import {formatPackage, formatPkgManager} from '#util/format';
import {fromUnknownError} from '#util/from-unknown-error';
import {isExecOutput} from '#util/guard/exec-output';
import {isSmokerError} from '#util/guard/smoker-error';

/**
 * @group Errors
 */
export class InstallError extends BaseSmokerError<
  {
    cwd: string;
    originalMessage: string;
    pkgManager: StaticPkgManagerSpec;
    pkgSpec: string;
    result?: ExecOutput;
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
    let result: ExecOutput | undefined;

    if (isSmokerError(ExecError, rawResult)) {
      error = rawResult;
      result = rawResult;
    } else if (isExecOutput(rawResult)) {
      result = rawResult;
    } else {
      error = fromUnknownError(rawResult);
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
