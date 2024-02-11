import {red} from 'chalk';
import type {ExecError} from '../component/executor';
import {type PkgManagerSpec} from '../component/pkg-manager/pkg-manager-spec';
import {BaseSmokerError} from './base-error';

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
