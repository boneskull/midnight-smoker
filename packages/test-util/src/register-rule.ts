import type {Component, Plugin} from 'midnight-smoker/plugin';
import {
  Blessed,
  PluginMetadata,
  PluginRegistry,
  Rule,
} from 'midnight-smoker/plugin';

/**
 * Registers a rule in the plugin registry.
 *
 * @param factoryOrRuleDef - The factory function or partial rule definition.
 * @param registry - The plugin registry to use (optional, default is a new
 *   instance of PluginRegistry).
 * @param pluginName - The name of the plugin (optional, default is
 *   'test-plugin').
 * @r e turns The registered rule.
 */
export async function registerRule(
  factoryOrRuleDef: Plugin.PluginFactory | Partial<Rule.SomeRuleDef>,
  registry = PluginRegistry.create(),
  pluginName = 'test-plugin',
): Promise<Component<Rule.SomeRule>> {
  const blessedMetadata = await registry.getBlessedMetadata();

  const phonyMetadata = Blessed.isBlessedPlugin(pluginName)
    ? blessedMetadata[pluginName]
    : PluginMetadata.PluginMetadata.createTransient(pluginName);

  let factory: Plugin.PluginFactory;
  let ruleDef: Rule.SomeRuleDef | undefined;

  if (Rule.isPartialRuleDef(factoryOrRuleDef)) {
    ruleDef = {
      check: () => {},
      description: 'test description',
      name: 'test rule',
      ...factoryOrRuleDef,
    };
    factory = ({defineRule}) => {
      defineRule(ruleDef!);
    };
  } else {
    factory = factoryOrRuleDef as Plugin.PluginFactory;
  }

  const metadata = await registry.registerPlugin(phonyMetadata, {
    plugin: async (api) => {
      await factory(api);
    },
  });

  if (ruleDef) {
    return metadata.ruleMap.get(ruleDef.name)!;
  }

  return metadata.rules[0]!;
}
