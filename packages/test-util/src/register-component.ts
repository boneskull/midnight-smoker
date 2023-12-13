/**
 * This is so deliberate because GitHub copilot wrote most of it.
 *
 * @packageDocumentation
 */

import {
  DEFAULT_COMPONENT_ID,
  Executor,
  PkgManager,
  Plugin,
  PluginAPI,
  PluginRegistry,
  RuleRunner,
  ScriptRunner,
} from 'midnight-smoker/plugin';

export interface RegisterComponentOpts {
  registry?: PluginRegistry;
  name?: string;
  pluginName?: string;
  api?: Partial<PluginAPI>;
}

type ComponentTypes = {
  RuleRunner: RuleRunner.RuleRunner;
  ScriptRunner: ScriptRunner.ScriptRunner;
  Executor: Executor.Executor;
  PackageManager: PkgManager.PackageManagerModule;
};

type ComponentType = keyof ComponentTypes;

export async function registerComponent<T extends ComponentType>(
  type: T,
  component: ComponentTypes[T],
  {
    registry = PluginRegistry.create(),
    name = DEFAULT_COMPONENT_ID,
    pluginName = 'test-plugin',
    api: apiOverrides,
  }: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  const plugin: Plugin.PluginObject = {
    plugin: (api) => {
      api = {...api, ...apiOverrides};
      switch (type) {
        case 'RuleRunner':
          api.defineRuleRunner(component as RuleRunner.RuleRunner, name);
          break;
        case 'ScriptRunner':
          api.defineScriptRunner(component as ScriptRunner.ScriptRunner, name);
          break;
        case 'Executor':
          api.defineExecutor(component as Executor.Executor, name);
          break;
        case 'PackageManager':
          api.definePackageManager(
            component as PkgManager.PackageManagerModule,
            name,
          );
          break;
        default:
          throw new Error(`Unknown component type: ${type}`);
      }
    },
  };
  await registry.registerPlugin(pluginName, plugin);
  return registry;
}

export async function registerRuleRunner(
  component: RuleRunner.RuleRunner,
  options: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  return registerComponent('RuleRunner', component, options);
}

export async function registerScriptRunner(
  component: ScriptRunner.ScriptRunner,
  options: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  return registerComponent('ScriptRunner', component, options);
}

export async function registerExecutor(
  component: Executor.Executor,
  options: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  return registerComponent('Executor', component, options);
}

export async function registerPackageManager(
  component: PkgManager.PackageManagerModule,
  options: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  return registerComponent('PackageManager', component, options);
}
