import type {Plugin, PluginAPI} from 'midnight-smoker/plugin';
import noBannedFiles from './no-banned-files';
import noMissingEntryPoint from './no-missing-entry-point';
import noMissingExports from './no-missing-exports';
import noMissingPkgFiles from './no-missing-pkg-files';

const rules = [
  noBannedFiles,
  noMissingEntryPoint,
  noMissingExports,
  noMissingPkgFiles,
] as const satisfies Readonly<Plugin.PluginFactory[]>;

export function loadRules(api: PluginAPI) {
  for (const rule of rules) {
    rule(api);
  }
}
