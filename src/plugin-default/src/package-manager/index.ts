import type {PluginAPI} from 'midnight-smoker/plugin';

import {Npm7} from './npm7.js';
import {Npm9} from './npm9.js';
import {YarnBerry} from './yarn-berry.js';
import {YarnClassic} from './yarn-classic.js';

const packageManagers = [Npm7, Npm9, YarnBerry, YarnClassic] as const;

export function loadPkgManagers(api: PluginAPI) {
  for (const pkgManager of packageManagers) {
    api.definePackageManager(pkgManager);
  }
}
