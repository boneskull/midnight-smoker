import type {PluginAPI} from '#plugin/plugin-api';
import {NonEmptyStringSchema, VoidOrPromiseVoidSchema} from '#util/schema-util';
import {isObject} from 'lodash';
import {z} from 'zod';

export const PluginFactorySchema = z
  .function()
  .args(z.custom<PluginAPI>().readonly())
  .returns(VoidOrPromiseVoidSchema);

/**
 * A function which receives a {@link PluginAPI} and uses it to define the
 * plugin.
 */
export type PluginFactory = z.infer<typeof PluginFactorySchema>;

export const PluginSchema = z
  .preprocess(
    (value) =>
      isObject(value) && 'default' in value && !('plugin' in value)
        ? value.default
        : value,
    z
      .object({
        plugin: PluginFactorySchema,
        name: NonEmptyStringSchema.optional(),
        description: NonEmptyStringSchema.optional(),
        version: NonEmptyStringSchema.optional(),
      })
      .passthrough(),
  )
  .describe(
    'An object with a "plugin" property and optionally a name and description',
  );

export type Plugin = z.infer<typeof PluginSchema>;
