import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {red} from 'chalk';
import {BaseSmokerError} from './base-error';

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
  workspace: WorkspaceInfo;
}> {
  public readonly id = 'PackError';

  constructor(
    message: string,
    pkgManager: string | PkgManagerSpec,
    workspace: WorkspaceInfo,
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
      workspace,
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
    workspace: WorkspaceInfo;
  },
  SyntaxError
> {
  public readonly id = 'PackParseError';

  constructor(
    message: string,
    pkgManager: string | PkgManagerSpec,
    workspace: WorkspaceInfo,
    error: SyntaxError,
    output: string,
  ) {
    super(message, {pkgManager: `${pkgManager}`, output, workspace}, error);
  }
}
