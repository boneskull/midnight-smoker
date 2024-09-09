import type {PluginAPI, PluginFactory} from 'midnight-smoker/plugin';

import noBannedFiles from './no-banned-files.js';
import noMissingEntryPoint from './no-missing-entry-point.js';
import noMissingExports from './no-missing-exports.js';
import noMissingPkgFiles from './no-missing-pkg-files.js';

const rules = [
  noBannedFiles,
  noMissingEntryPoint,
  noMissingExports,
  noMissingPkgFiles,
] as const satisfies Readonly<PluginFactory[]>;

export function loadRules(api: PluginAPI) {
  for (const rule of rules) {
    rule(api);
  }
}
