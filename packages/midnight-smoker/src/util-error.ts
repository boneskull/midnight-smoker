import {BaseSmokerError} from './error/base-error';

/**
 * @group Errors
 */
export class MissingPackageJsonError extends BaseSmokerError<{
  cwd: string;
}> {
  public readonly id = 'MissingPackageJsonError';
  constructor(message: string, cwd: string) {
    super(message, {cwd});
  }
}
/**
 * @group Errors
 */
export class UnreadablePackageJsonError extends BaseSmokerError<
  {
    pkgJsonPath: string;
  },
  Error
> {
  public readonly id = 'UnreadablePackageJsonError';

  constructor(message: string, pkgJsonPath: string, error: Error) {
    super(message, {pkgJsonPath}, error);
  }
}
/**
 * @group Errors
 */
export class DirCreationError extends BaseSmokerError<
  {prefix: string},
  NodeJS.ErrnoException
> {
  public readonly id = 'DirCreationError';

  constructor(message: string, prefix: string, error: NodeJS.ErrnoException) {
    super(message, {prefix}, error);
  }
}
