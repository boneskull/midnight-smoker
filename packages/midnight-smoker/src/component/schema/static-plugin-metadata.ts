import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * Subset of plugin metadata exposed to other plugins, reporters, etc.
 */
export const StaticPluginMetadataSchema = z.strictObject({
  /**
   * The full identifier of the plugin. Either custom name or package name.
   */
  id: NonEmptyStringSchema.describe(
    'The full identifier of the plugin. Either custom name or package name.',
  ),

  /**
   * The version of the plugin, if available
   */
  version: NonEmptyStringSchema.optional().describe(
    'The version of the plugin, if available',
  ),

  /**
   * The description of the plugin, if available
   */
  description: NonEmptyStringSchema.optional().describe(
    'The description of the plugin, if available',
  ),

  /**
   * Entry point of plugin.
   */
  entryPoint: NonEmptyStringSchema.describe('Entry point of plugin.'),
});

export type StaticPluginMetadata = z.infer<typeof StaticPluginMetadataSchema>;
