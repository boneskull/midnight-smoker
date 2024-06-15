import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {fromUnknownError} from '#util/error-util';
import {red} from 'chalk';
import {isString} from 'lodash';
import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class PackError extends BaseSmokerError<
  {
    spec: string;
    dest: string;
    workspace: WorkspaceInfo;
  },
  Error | undefined
> {
  public readonly id = 'PackError';

  constructor(
    message: string,
    pkgManager: string | StaticPkgManagerSpec,
    workspace: WorkspaceInfo,
    dest: string,
    error?: unknown,
  ) {
    const pmSpec = isString(pkgManager) ? pkgManager : pkgManager.spec;
    super(
      `Package manager ${pmSpec} failed to pack: ${red(message)}`,
      {
        spec: pmSpec,
        dest,
        workspace,
      },
      fromUnknownError(error),
    );
  }
}
