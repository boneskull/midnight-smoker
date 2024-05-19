/**
 * This is the definition of the `plugin-default` plugin.
 */

import {
  DEFAULT_EXECUTOR_ID,
  SYSTEM_EXECUTOR_ID,
} from 'midnight-smoker/constants';
import type {PluginAPI} from 'midnight-smoker/plugin';
import {corepackExecutor} from './corepack-executor';
import {loadPkgManagers} from './package-manager';
import {loadReporters} from './reporter';
import {loadRules} from './rules';
import {systemExecutor} from './system-executor';

export type * from './json-types';

export function plugin(api: PluginAPI) {
  api.defineExecutor(corepackExecutor, DEFAULT_EXECUTOR_ID);
  api.defineExecutor(systemExecutor, SYSTEM_EXECUTOR_ID);
  loadPkgManagers(api);
  loadRules(api);
  loadReporters(api);
}
