import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {isString} from 'lodash';
import {BaseSmokerError} from './base-error';

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
    pkgManager: string | StaticPkgManagerSpec,
    workspace: WorkspaceInfo,
    error: SyntaxError,
    output: string,
  ) {
    const pmSpec = isString(pkgManager) ? pkgManager : pkgManager.spec;
    super(message, {pkgManager: pmSpec, output, workspace}, error);
  }
}
