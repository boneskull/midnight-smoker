import {type WorkspaceInfo} from '#schema/workspace-info';

import {BaseSmokerError} from './base-error.js';

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
