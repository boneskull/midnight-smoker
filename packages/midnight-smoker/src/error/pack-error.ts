import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {formatPackage, formatPkgManager} from '#util/format';
import {isError} from 'lodash';

import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class PackError extends BaseSmokerError<
  {
    data?: unknown;
    dest: string;
    originalMessage: string;
    pkgManager: StaticPkgManagerSpec;
    workspace: WorkspaceInfo;
  },
  Error | undefined
> {
  public readonly name = 'PackError';

  constructor(
    message: string,
    pkgManager: StaticPkgManagerSpec,
    workspace: WorkspaceInfo,
    dest: string,
    extra?: unknown,
  ) {
    let err: Error | undefined;
    let data: unknown;
    if (isError(extra)) {
      err = extra;
    } else {
      data = extra;
    }
    super(
      `${pkgManager.label} failed to pack package "${workspace.pkgName}"`,
      {
        data,
        dest,
        originalMessage: message,
        pkgManager,
        workspace,
      },
      err,
    );
  }

  public override formatMessage(_verbose?: boolean): string {
    return `${formatPkgManager(
      this.context.pkgManager,
    )} failed to pack package ${formatPackage(
      this.context.workspace.pkgName,
    )}: ${this.context.originalMessage}`;
  }
}
