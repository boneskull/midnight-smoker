import type {Plugin, PluginAPI} from 'midnight-smoker/plugin';
import {PluginMetadata, PluginRegistry} from 'midnight-smoker/plugin';

export interface BaseRegisterPluginOpts {
  pluginName?: string;
  entryPoint?: string;
  description?: string;
  version?: string;
  registry?: PluginRegistry;
  api?: Partial<PluginAPI>;
}

export interface RegisterPluginOptsWithFactory extends BaseRegisterPluginOpts {
  factory: Plugin.PluginFactory;
}

export interface RegisterPluginOptsWithPluginObject
  extends BaseRegisterPluginOpts {
  plugin: Plugin.Plugin;
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
 * @param id - Plugin name
 * @param opts - Options; optionally supply `plugin` or `factory` but not both
 * @returns If `opts.registry` provided, then that value; otherwise a new
 *   {@link PluginRegistry} instance.
 */
export async function registerPlugin(
  opts: RegisterPluginOpts = {},
): Promise<PluginRegistry> {
  const {
    pluginName: id = 'test-plugin',
    description = 'test description',
    version = '1.0.0',
    registry = PluginRegistry.create(),
  } = opts;
  const metadata = PluginMetadata.PluginMetadata.createTransient(id, {
    description,
    version,
    name: id,
  });

  const pluginObject =
    'plugin' in opts
      ? opts.plugin
      : 'factory' in opts
        ? {plugin: opts.factory}
        : {plugin: () => {}};

  await registry.registerPlugin(metadata, pluginObject);
  return registry;
}
