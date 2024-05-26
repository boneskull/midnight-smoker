import type {Plugin} from '../../../src/plugin';
import {nullPkgManager, nullReporter, nullRule} from './component';

export const nullPlugin: Plugin = {
  plugin(api) {
    api
      .defineReporter(nullReporter)
      .definePackageManager(nullPkgManager)
      .defineRule(nullRule);
  },
};
