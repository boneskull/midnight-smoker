/**
 * Subset of metadata exposed to other plugins.
 */

export interface StaticPluginMetadata {
  /**
   * The full identifier of the plugin. Either custom name or package name.
   */
  id: string;

  /**
   * The version of the plugin, if available
   */
  version?: string;

  /**
   * The description of the plugin, if available
   */
  description?: string;

  /**
   * Entry point of plugin.
   */
  entryPoint: string;
}
