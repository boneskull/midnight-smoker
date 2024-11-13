import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {type Executor} from '#defs/executor';
import {type PkgManager} from '#defs/pkg-manager';
import {type Reporter} from '#defs/reporter';
import {type Rule} from '#defs/rule';
import {type Plugin} from '#schema/plugin';

import {
  nullExecutor,
  nullPkgManager,
  nullReporter,
  nullRule,
} from './component';

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
