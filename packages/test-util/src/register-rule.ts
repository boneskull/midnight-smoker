import {type Component} from 'midnight-smoker/component';
import {
  type Plugin,
  type PluginFactory,
  type PluginMetadata,
  type PluginRegistry,
} from 'midnight-smoker/plugin';
import {isBlessedPlugin} from 'midnight-smoker/plugin/blessed';
import {
  isPartialRuleDef,
  type SomeRule,
  type SomeRuleDef,
} from 'midnight-smoker/rule';
import {
  DEFAULT_TEST_PLUGIN_NAME,
  DEFAULT_TEST_RULE_DESCRIPTION,
  DEFAULT_TEST_RULE_NAME,
} from './constants';

/**
 * Registers a rule in the plugin registry.
 *
 * @param factoryOrRuleDef - The factory function or partial rule definition.
 * @param registry - The plugin registry to use (optional, default is a new
 *   instance of PluginRegistry).
 * @param pluginName - The name of the plugin (optional, default is
 *   'test-plugin').
 * @returns The registered rule.
 */
export async function registerRule(
  registry: PluginRegistry,
  factoryOrRuleDef: PluginFactory | Partial<SomeRuleDef>,
  pluginName = DEFAULT_TEST_PLUGIN_NAME,
): Promise<Component<SomeRule>> {
  const blessedMetadata = await registry.getBlessedMetadata();
  let phonyMetadata: PluginMetadata | undefined;
  if (isBlessedPlugin(pluginName)) {
    phonyMetadata = blessedMetadata[pluginName];
  }

  let factory: PluginFactory;
  let ruleDef: SomeRuleDef | undefined;

  if (isPartialRuleDef(factoryOrRuleDef)) {
    ruleDef = {
      check: () => {},
      description: DEFAULT_TEST_RULE_DESCRIPTION,
      name: DEFAULT_TEST_RULE_NAME,
      ...factoryOrRuleDef,
    };
    factory = ({defineRule}) => {
      defineRule(ruleDef!);
    };
  } else {
    factory = factoryOrRuleDef as PluginFactory;
  }

  const plugin: Plugin = {
    plugin: factory,
  };

  // more terrible overload verbosity
  const metadata = phonyMetadata
    ? await registry.registerPlugin(phonyMetadata, plugin)
    : await registry.registerPlugin(pluginName, plugin);

  if (ruleDef) {
    return metadata.ruleMap.get(ruleDef.name)!;
  }

  return metadata.rules[0]!;
}
