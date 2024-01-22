/**
 * This is so deliberate because GitHub copilot wrote most of it.
 *
 * @packageDocumentation
 */

import {DEFAULT_COMPONENT_ID} from 'midnight-smoker/constants';
import {type Executor} from 'midnight-smoker/executor';
import {type PkgManagerDef} from 'midnight-smoker/pkg-manager';
import {
  type Plugin,
  type PluginAPI,
  type PluginRegistry,
} from 'midnight-smoker/plugin';
import {type RuleRunner} from 'midnight-smoker/rule-runner';
import {type ScriptRunner} from 'midnight-smoker/script-runner';
import {DEFAULT_TEST_PLUGIN_NAME} from './constants';

export interface RegisterComponentOpts {
  name?: string;
  pluginName?: string;
  api?: Partial<PluginAPI>;
}

type ComponentTypes = {
  RuleRunner: RuleRunner;
  ScriptRunner: ScriptRunner;
  Executor: Executor;
  PackageManager: PkgManagerDef;
};

type ComponentType = keyof ComponentTypes;

export async function registerComponent<T extends ComponentType>(
  registry: PluginRegistry,
  type: T,
  component: ComponentTypes[T],
  {
    name = DEFAULT_COMPONENT_ID,
    pluginName = DEFAULT_TEST_PLUGIN_NAME,
    api: apiOverrides,
  }: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  const plugin: Plugin = {
    plugin: (api) => {
      api = {...api, ...apiOverrides};
      switch (type) {
        case 'RuleRunner':
          api.defineRuleRunner(component as RuleRunner, name);
          break;
        case 'ScriptRunner':
          api.defineScriptRunner(component as ScriptRunner, name);
          break;
        case 'Executor':
          api.defineExecutor(component as Executor, name);
          break;
        case 'PackageManager':
          api.definePackageManager(component as PkgManagerDef, name);
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
  registry: PluginRegistry,
  component: RuleRunner,
  options: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  return registerComponent(registry, 'RuleRunner', component, options);
}

export async function registerScriptRunner(
  registry: PluginRegistry,
  component: ScriptRunner,
  options: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  return registerComponent(registry, 'ScriptRunner', component, options);
}

export async function registerExecutor(
  registry: PluginRegistry,
  component: Executor,
  options: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  return registerComponent(registry, 'Executor', component, options);
}

export async function registerPackageManager(
  registry: PluginRegistry,
  component: PkgManagerDef,
  options: RegisterComponentOpts = {},
): Promise<PluginRegistry> {
  return registerComponent(registry, 'PackageManager', component, options);
}
