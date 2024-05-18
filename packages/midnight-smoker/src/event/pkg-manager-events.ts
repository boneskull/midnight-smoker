import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';

export interface PkgManagerEventBase {
  totalPkgManagers: number;
  pkgManager: StaticPkgManagerSpec;
}
