import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';

export interface PkgManagerEventBase {
  totalPkgManagers: number;
  pkgManager: StaticPkgManagerSpec;
  workspaceInfo: WorkspaceInfo[];
}
