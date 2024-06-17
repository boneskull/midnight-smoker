import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type Result} from '#util/result';

export interface PkgManagerEventBase {
  totalPkgManagers: number;
  pkgManager: StaticPkgManagerSpec;
  workspaceInfo: Result<WorkspaceInfo>[];
}
