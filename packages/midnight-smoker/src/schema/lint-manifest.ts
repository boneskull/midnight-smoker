import {type WorkspaceInfo} from '#schema/workspaces';

export interface LintManifest extends WorkspaceInfo {
  installPath: string;
}
