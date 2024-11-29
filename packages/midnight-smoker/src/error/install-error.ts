import {type InstallManifest} from '#defs/pkg-manager';
import {BaseSmokerError} from '#error/base-error';
import {ExecError} from '#error/exec-error';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';
import {formatPackage, formatPkgManager} from '#util/format';
import {fromUnknownError} from '#util/from-unknown-error';
import {assertExecOutput} from '#util/guard/assert/exec-output';
import {isSmokerError} from '#util/guard/smoker-error';
import {isExecOutput} from '#util/index';
import {isError} from 'remeda';

import {type UnknownError} from './unknown-error';
import {asValidationError, type ValidationError} from './validation-error';

/**
 * @group Errors
 */
export class InstallError extends BaseSmokerError<
  {
    installManifest: InstallManifest;
    pkgManager: StaticPkgManagerSpec;
    result?: unknown;
  },
  ExecError | undefined | UnknownError | ValidationError
> {
  public readonly name = 'InstallError';

  constructor(
    resultOrError: unknown,
    installManifest: InstallManifest,
    pkgManager: StaticPkgManagerSpec,
  ) {
    let error: ExecError | undefined | UnknownError | ValidationError;
    let result: unknown;
    if (isSmokerError(ExecError, resultOrError)) {
      error = resultOrError;
      result = isExecOutput(resultOrError) ? resultOrError : undefined;
    } else if (isError(resultOrError)) {
      error = fromUnknownError(resultOrError, true);
      result = undefined;
    } else {
      try {
        assertExecOutput(resultOrError);
        result = resultOrError;
        error = undefined;
      } catch (err) {
        result = resultOrError;
        error = asValidationError(err);
      }
    }

    super(
      `${pkgManager.label} failed to install package "${installManifest.pkgSpec}" in dir ${installManifest.cwd}`,
      {
        installManifest,
        pkgManager,
        result,
      },
      error,
    );
  }

  public override formatMessage(_verbose?: boolean): string {
    let msg = `${formatPkgManager(
      this.context.pkgManager,
    )} failed to install package ${formatPackage(
      this.context.installManifest.pkgSpec,
    )} in dir ${this.context.installManifest.cwd}`;
    if (this.cause?.message) {
      msg += `: ${this.cause?.message}`;
    } else if (
      isExecOutput(this.context.result) &&
      this.context.result.exitCode !== 0
    ) {
      msg += `: exit code ${this.context.result?.exitCode}`;
    }
    return msg;
  }
}
