/**
 * This is the definition of the `plugin-default` plugin.
 */

import type {PluginAPI} from 'midnight-smoker/plugin';
import {corepackExecutor} from './corepack-executor';
import {loadPkgManagers} from './package-manager';
import {loadReporters} from './reporter';
import {loadRuleRunner} from './rule-runner';
import {loadRules} from './rules';
import {loadScriptRunner} from './script-runner';
import {systemExecutor} from './system-executor';
export function plugin(api: PluginAPI) {
  loadScriptRunner(api);
  api.defineExecutor(corepackExecutor);
  api.defineExecutor(systemExecutor, 'system');
  loadRuleRunner(api);
  loadPkgManagers(api);
  loadRules(api);
  loadReporters(api);
}
