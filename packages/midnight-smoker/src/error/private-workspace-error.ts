import {type WorkspaceInfo} from '#schema/workspace-info';
import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class PrivateWorkspaceError extends BaseSmokerError<{
  cwd: string;
  workspaceInfo: WorkspaceInfo[];
}> {
  public readonly id = 'PrivateWorkspaceError';

  constructor(message: string, cwd: string, workspaceInfo: WorkspaceInfo[]) {
    super(message, {cwd, workspaceInfo});
  }
}
