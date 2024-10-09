import {BaseSmokerError} from '#error/base-error';
import {type WorkspaceInfo} from '#schema/workspace-info';

/**
 * @group Errors
 */

export class PrivateWorkspaceError extends BaseSmokerError<{
  cwd: string;
  workspaceInfo: WorkspaceInfo[];
}> {
  public readonly name = 'PrivateWorkspaceError';

  constructor(message: string, cwd: string, workspaceInfo: WorkspaceInfo[]) {
    super(message, {cwd, workspaceInfo});
  }
}
