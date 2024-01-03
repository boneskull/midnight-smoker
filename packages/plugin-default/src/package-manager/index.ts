import type {PkgManager, PluginAPI} from 'midnight-smoker/plugin';
import Npm7 from './npm7';
import Npm9 from './npm9';
import YarnBerry from './yarn-berry';
import YarnClassic from './yarn-classic';

const packageManagers = {
  Npm7,
  Npm9,
  YarnClassic,
  YarnBerry,
} as const satisfies Record<string, PkgManager.PkgManagerDef>;

export function loadPkgManagers(api: PluginAPI) {
  for (const [name, pkgManager] of Object.entries(packageManagers)) {
    api.definePackageManager(pkgManager, name);
  }
}
