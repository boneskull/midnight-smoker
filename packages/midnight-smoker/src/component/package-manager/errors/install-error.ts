import {red} from 'chalk';
import {BaseSmokerError} from '../../../error/base-error';
import type {ExecError} from '../../executor';
import {type PkgManagerSpec} from '../pkg-manager-spec';

/**
 * @group Errors
 */
export class InstallError extends BaseSmokerError<
  {
    pkgManager: string;
    installSpecs: string[];
    cwd: string;
    exitCode?: number;
    output?: string;
    error?: object;
  },
  ExecError | undefined
> {
  public readonly id = 'InstallError';

  constructor(
    message: string,
    pkgManager: string | PkgManagerSpec,
    installSpecs: string[],
    cwd: string,
    {
      error,
      exitCode,
      output,
    }: {error?: object; exitCode?: number; output?: string} = {},
    execError?: ExecError,
  ) {
    super(
      `Package manager ${pkgManager} failed to install ${installSpecs.join(
        ', ',
      )} in dir ${cwd}: ${red(message)}`,
      {pkgManager: `${pkgManager}`, installSpecs, cwd, exitCode, output, error},
      execError,
    );
  }
}
