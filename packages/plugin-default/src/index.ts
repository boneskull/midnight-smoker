/**
 * This is the definition of the `plugin-default` plugin.
 */

import type {PluginAPI} from 'midnight-smoker/plugin';
import {corepackExecutor} from './corepack-executor';
import {loadPkgManagers} from './package-manager';
import {loadReporters} from './reporter';

import {loadRules} from './rules';
import {systemExecutor} from './system-executor';
export function plugin(api: PluginAPI) {
  api.defineExecutor(corepackExecutor);
  api.defineExecutor(systemExecutor, 'system');
  loadPkgManagers(api);
  loadRules(api);
  loadReporters(api);
}
