import {type StaticPkgManagerSpec} from '../component';

export interface PkgManagerEventBase {
  totalPkgManagers: number;
  pkgManager: StaticPkgManagerSpec;
}
