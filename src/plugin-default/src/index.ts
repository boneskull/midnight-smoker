/**
 * This is the definition of the `plugin-default` plugin.
 */

import type {PluginAPI} from 'midnight-smoker/plugin';

import {
  DEFAULT_EXECUTOR_ID,
  SYSTEM_EXECUTOR_ID,
} from 'midnight-smoker/constants';

import {corepackExecutor} from './corepack-executor.js';
import {loadPkgManagers} from './package-manager/index.js';
import {loadReporters} from './reporter/index.js';
import {loadRules} from './rules/index.js';
import {systemExecutor} from './system-executor.js';

export type * from './json-types.js';

export function plugin(api: PluginAPI) {
  api.defineExecutor(corepackExecutor, DEFAULT_EXECUTOR_ID);
  api.defineExecutor(systemExecutor, SYSTEM_EXECUTOR_ID);
  loadPkgManagers(api);
  loadRules(api);
  loadReporters(api);
}
