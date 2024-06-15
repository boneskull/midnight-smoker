import {type WorkspaceInfo} from '#schema/workspace-info';

export interface LintManifest extends WorkspaceInfo {
  installPath: string;
}
