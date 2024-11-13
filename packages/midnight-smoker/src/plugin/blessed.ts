/**
 * Contains a list of "blessed" or "official" plugin(s).
 *
 * Any `Component`s provided by these plugins will have bare identifiers.
 *
 * @module midnight-smoker/plugin/blessed
 */

export const PLUGIN_DEFAULT_ID = '@midnight-smoker/plugin-default';

export const BLESSED_PLUGINS = [PLUGIN_DEFAULT_ID] as const;

export type BlessedPlugin = (typeof BLESSED_PLUGINS)[number];
