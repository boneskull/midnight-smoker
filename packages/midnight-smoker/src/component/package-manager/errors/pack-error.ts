import {red} from 'chalk';
import {BaseSmokerError} from '../../../error/base-error';
import {type PkgManagerSpec} from '../pkg-manager-spec';

/**
 * @group Errors
 */
export class PackError extends BaseSmokerError<{
  spec: string;
  dest: string;
  cwd?: string;
  exitCode?: number;
  output?: string;
  error?: object;
}> {
  public readonly id = 'PackError';

  constructor(
    message: string,
    pkgManager: string | PkgManagerSpec,
    dest: string,
    {
      cwd,
      error,
      exitCode,
      output,
    }: {cwd?: string; error?: object; exitCode?: number; output?: string} = {},
  ) {
    super(`Package manager ${pkgManager} failed to pack: ${red(message)}`, {
      error,
      spec: `${pkgManager}`,
      cwd,
      dest,
      exitCode,
      output,
    });
  }
}
/**
 * @group Errors
 */
export class PackParseError extends BaseSmokerError<
  {
    pkgManager: string;
    output: string;
  },
  SyntaxError
> {
  public readonly id = 'PackParseError';

  constructor(
    message: string,
    pkgManager: string | PkgManagerSpec,
    error: SyntaxError,
    output: string,
  ) {
    super(message, {pkgManager: `${pkgManager}`, output}, error);
  }
}
