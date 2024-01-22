/**
 * Contains a list of "blessed" or "official" plugin(s).
 *
 * Any `Component`s provided by these plugins will have bare identifiers.
 *
 * @packageDocumentation
 */

export const PLUGIN_DEFAULT_ID = '@midnight-smoker/plugin-default';

export const BLESSED_PLUGINS = [PLUGIN_DEFAULT_ID] as const;

export type BlessedPlugin = (typeof BLESSED_PLUGINS)[number];

/**
 * Checks if the given identifier is a {@link BlessedPlugin}.
 *
 * Type guard.
 *
 * @param id The identifier to check.
 * @returns `true` if the identifier is a {@link BlessedPlugin}, `false`
 *   otherwise.
 */
export function isBlessedPlugin(id: unknown): id is BlessedPlugin {
  return BLESSED_PLUGINS.includes(id as BlessedPlugin);
}
