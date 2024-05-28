import {ExecError} from '#error/exec-error';
import {isExecResult, type ExecResult} from '#schema/exec-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {isExecaError, isSmokerError} from '#util/error-util';
import {red} from 'chalk';
import {isString} from 'lodash';
import {BaseSmokerError} from './base-error';
import {fromUnknownError} from './from-unknown-error';

/**
 * @group Errors
 */
export class InstallError extends BaseSmokerError<
  {
    pkgManager: string;
    pkgSpec: string;
    cwd: string;
    result?: ExecResult;
  },
  ExecError | Error | undefined
> {
  public readonly id = 'InstallError';

  constructor(
    message: string,
    pkgManager: string | StaticPkgManagerSpec,
    pkgSpec: string,
    cwd: string,
    rawResult: unknown,
  ) {
    const pmSpec = isString(pkgManager) ? pkgManager : pkgManager.spec;
    let error: ExecError | Error | undefined;
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
      `Package manager ${pmSpec} failed to install "${pkgSpec}" in dir ${cwd}: ${red(
        message,
      )}`,
      {
        pkgManager: pmSpec,
        pkgSpec,
        cwd,
        result,
      },
      error,
    );
  }
}
