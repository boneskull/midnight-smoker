import {NonEmptyStringSchema} from '#util/schema-util';
import {isFunction, isObject} from 'lodash';
import {z} from 'zod';
import type {PluginAPI} from './plugin-api';

/**
 * A function which receives a {@link PluginAPI} and uses it to define the
 * plugin.
 */
export type PluginFactory = (api: Readonly<PluginAPI>) => void | Promise<void>;

const zPluginFactory = z
  .custom<PluginFactory>(
    isFunction,
    'Must be a `void` or `async void` function accepting a `PluginAPI` argument',
  )
  .describe(
    'A `void` or `async void` function accepting a `PluginAPI` argument',
  );

export const zPlugin = z
  .preprocess(
    (value) =>
      isObject(value) && 'default' in value && !('plugin' in value)
        ? value.default
        : value,
    z.object({
      plugin: zPluginFactory,
      name: NonEmptyStringSchema.optional(),
      description: NonEmptyStringSchema.optional(),
      version: NonEmptyStringSchema.optional(),
    }),
  )
  .describe(
    'An object with a "plugin" property and optionally a name and description',
  );

export type Plugin = z.infer<typeof zPlugin>;
