import {type PluginAPI} from '#plugin/plugin-api';
import {isObject} from '#util/guard/common';
import {z} from 'zod';

import {NonEmptyStringSchema, VoidOrPromiseVoidSchema} from './util/util';

/**
 * A function which receives a {@link PluginAPI} object and uses its methods to
 * define components.
 *
 * The most common methods on the `api` object are:
 *
 * - {@link PluginAPI.defineRule}
 * - {@link PluginAPI.definePackageManager}
 * - {@link PluginAPI.defineReporter}
 */
export type PluginInitializer = (
  api: Readonly<PluginAPI>,
) => Promise<void> | void;

export const PluginInitializerSchema: z.ZodType<PluginInitializer> = z
  .function()
  .args(z.custom<PluginAPI>().readonly())
  .returns(VoidOrPromiseVoidSchema);

/**
 * A plugin object; the entry point for a plugin.
 *
 * Props can be named exports (recommended) or a `Plugin` object may be the
 * default export (discouraged).
 *
 * At minimum, a plugin needs a {@link PluginInitializer}.
 */
export type Plugin = {
  [key: string]: unknown;
  description?: string;
  name?: string;
  plugin: PluginInitializer;
  version?: string;
};

export const PluginSchema = z
  .preprocess(
    (value) =>
      isObject(value) && 'default' in value && !('plugin' in value)
        ? value.default
        : value,
    z
      .object({
        description: NonEmptyStringSchema.optional(),
        name: NonEmptyStringSchema.optional(),
        plugin: PluginInitializerSchema,
        version: NonEmptyStringSchema.optional(),
      })
      .passthrough() as z.ZodType<Plugin>,
  )
  .describe(
    'An object with a "plugin" property and optionally a name and description',
  );
