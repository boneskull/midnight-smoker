import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {isString} from 'lodash';

import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class PackParseError extends BaseSmokerError<
  {
    output: string;
    pkgManager: string;
    workspace: WorkspaceInfo;
  },
  SyntaxError
> {
  public readonly name = 'PackParseError';

  constructor(
    message: string,
    pkgManager: StaticPkgManagerSpec | string,
    workspace: WorkspaceInfo,
    error: SyntaxError,
    output: string,
  ) {
    const pmSpec = isString(pkgManager) ? pkgManager : pkgManager.label;
    super(message, {output, pkgManager: pmSpec, workspace}, error);
  }
}
