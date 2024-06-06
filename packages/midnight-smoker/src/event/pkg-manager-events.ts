import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type Result, type WorkspaceInfo} from '#schema/workspaces';

export interface PkgManagerEventBase {
  totalPkgManagers: number;
  pkgManager: StaticPkgManagerSpec;
  workspaceInfo: Result<WorkspaceInfo>[];
}
