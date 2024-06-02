import type {Plugin} from '../../../src/plugin';
import {nullPkgManagerDef, nullReporter, nullRule} from './component';

export const nullPlugin: Plugin = {
  plugin(api) {
    api
      .defineReporter(nullReporter)
      .definePackageManager(nullPkgManagerDef)
      .defineRule(nullRule);
  },
};
