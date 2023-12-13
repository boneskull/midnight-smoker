/**
 * This is the definition of the `plugin-default` plugin.
 */

import type {PluginAPI} from 'midnight-smoker/plugin';
import {smokerExecutor} from './executor';
import {loadPkgManagers} from './package-manager';
import {loadReporters} from './reporter';
import {loadRuleRunner} from './rule-runner';
import {loadRules} from './rules';
import {loadScriptRunner} from './script-runner';
export function plugin(api: PluginAPI) {
  loadScriptRunner(api);
  api.defineExecutor(smokerExecutor);
  loadRuleRunner(api);
  loadPkgManagers(api);
  loadRules(api);
  loadReporters(api);
}
