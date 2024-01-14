import {red} from 'chalk';
import {BaseSmokerError} from '../../../error/base-error';
import type {ExecError} from '../../executor';

/**
 * @group Errors
 */
export class InstallError extends BaseSmokerError<
  {
    pmSpec: string;
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
    pmSpec: string,
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
      `Package manager ${pmSpec} failed to install ${installSpecs.join(
        ', ',
      )} in dir ${cwd}: ${red(message)}`,
      {pmSpec, installSpecs, cwd, exitCode, output, error},
      execError,
    );
  }
}
