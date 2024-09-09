import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {type Executor} from '#schema/executor';
import {type PkgManager} from '#schema/pkg-manager';
import {type Plugin} from '#schema/plugin';
import {type Reporter} from '#schema/reporter';
import {type Rule} from '#schema/rule';

import {
  nullExecutor,
  nullPkgManager,
  nullReporter,
  nullRule,
} from './component.js';

export type CreateDefaultPluginOptions = {
  defaultExecutor?: Executor;

  /**
   * Plugin id
   */
  name?: string;
  pkgManager?: PkgManager;
  reporter?: Reporter;
  rule?: Rule;

  systemExecutor?: Executor;
};

export const createPlugin = ({
  defaultExecutor = nullExecutor.bind(null),
  name = 'test-plugin',
  pkgManager = nullPkgManager,
  reporter = nullReporter,
  rule = nullRule,
  systemExecutor = nullExecutor.bind(null),
}: CreateDefaultPluginOptions = {}): Plugin => {
  return {
    name,
    plugin(api) {
      api.definePackageManager(pkgManager);
      api.defineRule(rule);
      api.defineReporter(reporter);
      api.defineExecutor(defaultExecutor, DEFAULT_EXECUTOR_ID);
      api.defineExecutor(systemExecutor, SYSTEM_EXECUTOR_ID);
    },
  };
};
