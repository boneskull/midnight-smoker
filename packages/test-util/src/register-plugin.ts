import {
  type Plugin,
  type PluginAPI,
  type PluginFactory,
  type PluginRegistry,
} from 'midnight-smoker/plugin';
import {
  DEFAULT_TEST_PLUGIN_DESCRIPTION,
  DEFAULT_TEST_PLUGIN_NAME,
  DEFAULT_TEST_PLUGIN_VERSION,
} from './constants';

export interface BaseRegisterPluginOpts {
  name?: string;
  entryPoint?: string;
  description?: string;
  version?: string;
  api?: Partial<PluginAPI>;
}

export interface RegisterPluginOptsWithFactory extends BaseRegisterPluginOpts {
  factory: PluginFactory;
}

export interface RegisterPluginOptsWithPluginObject
  extends BaseRegisterPluginOpts {
  plugin: Plugin;
}

/**
 * Options for {@link registerPlugin}
 */
export type RegisterPluginOpts =
  | RegisterPluginOptsWithFactory
  | RegisterPluginOptsWithPluginObject
  | BaseRegisterPluginOpts;

/**
 * Creates a transient plugin for testing purposes.
 *
 * When provided no options, it creates a no-op plugin with the name
 * {@link DEFAULT_TEST_PLUGIN_NAME} and other default values.
 *
 * @param id - Plugin name
 * @param opts - Options; optionally supply `plugin` or `factory` but not both
 * @returns If `opts.registry` provided, then that value; otherwise a new
 *   {@link PluginRegistry} instance.
 */
export async function registerPlugin(
  registry: PluginRegistry,
  opts: RegisterPluginOpts = {},
): Promise<PluginRegistry> {
  const {
    name = DEFAULT_TEST_PLUGIN_NAME,
    description = DEFAULT_TEST_PLUGIN_DESCRIPTION,
    version = DEFAULT_TEST_PLUGIN_VERSION,
  } = opts;

  const pluginObject: Plugin =
    'plugin' in opts
      ? opts.plugin
      : 'factory' in opts
        ? {plugin: opts.factory, name, description, version}
        : {plugin: () => {}, name, description, version};

  await registry.registerPlugin(name, pluginObject);
  return registry;
}
