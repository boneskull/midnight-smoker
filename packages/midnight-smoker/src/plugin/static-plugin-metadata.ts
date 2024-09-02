/**
 * Public information about a plugin suitable for serialization.
 */
export interface StaticPluginMetadata {
  /**
   * The plugin's description, if any
   */
  description?: string;

  /**
   * Path to the plugin's entry point
   */
  entryPoint: string;

  /**
   * The unique name or identifier of the plugin
   */
  id: string;

  /**
   * The names of the package managers supported by the plugin (if any)
   */
  pkgManagerNames: string[];

  /**
   * The names of the reporters provided by the plugin (if any)
   */
  reporterNames: string[];

  /**
   * The names of the rules provided by the plugin (if any)
   */
  ruleNames: string[];

  /**
   * The plugin's self-reported version, if any
   */
  version?: string;
}
