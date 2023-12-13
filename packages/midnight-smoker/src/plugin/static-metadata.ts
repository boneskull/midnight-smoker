/**
 * Subset of metadata exposed to other plugins.
 *
 * Returned by {@link PluginMetadata.toJSON}
 */

export interface StaticPluginMetadata {
  /**
   * The full identifier of the plugin. Usually the package name.
   */
  id: string;

  /**
   * The version of the plugin, if available in
   * {@link PluginMetadataOpts.pkgJson}
   */
  version?: string;

  /**
   * The description of the plugin, if available
   */
  description?: string;
}
