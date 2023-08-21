import {initPMLoader} from './pm-loader';
import npm7 from './npm7';
import npm9 from './npm9';
import yarnClassic from './yarn-classic';
import yarnBerry from './yarn-berry';

import type {PackageManagerModule} from './pm';

export type * from './pm';

export const BuiltinPMs: PackageManagerModule[] = [
  npm7,
  npm9,
  yarnClassic,
  yarnBerry,
];

export const loadPackageManagers = initPMLoader(BuiltinPMs);
