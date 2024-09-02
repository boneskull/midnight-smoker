import type {PluginAPI} from 'midnight-smoker/plugin';

import {Npm7} from './npm7';
import {Npm9} from './npm9';
import {YarnBerry} from './yarn-berry';
import {YarnClassic} from './yarn-classic';

const packageManagers = [Npm7, Npm9, YarnBerry, YarnClassic] as const;

export function loadPkgManagers(api: PluginAPI) {
  for (const pkgManager of packageManagers) {
    api.definePackageManager(pkgManager);
  }
}
