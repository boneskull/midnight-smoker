import {red} from 'chalk';
import {BaseSmokerError} from '../../../error/base-error';

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
    spec: string,
    dest: string,
    {
      cwd,
      error,
      exitCode,
      output,
    }: {cwd?: string; error?: object; exitCode?: number; output?: string} = {},
  ) {
    super(`Package manager ${spec} failed to pack: ${red(message)}`, {
      error,
      spec,
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
    pkgManager: string,
    error: SyntaxError,
    output: string,
  ) {
    super(message, {pkgManager, output}, error);
  }
}
