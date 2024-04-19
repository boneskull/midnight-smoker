import type {PluginAPI} from 'midnight-smoker/plugin';
import Npm7 from './npm7';
import Npm9 from './npm9';

const packageManagers = {
  Npm7,
  Npm9,
  // YarnClassic,
  // YarnBerry,
} as const;

export function loadPkgManagers(api: PluginAPI) {
  for (const [name, def] of Object.entries(packageManagers)) {
    api.definePackageManager(def, name);
  }
}
