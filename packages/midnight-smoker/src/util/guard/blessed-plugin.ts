/**
 * Provides {@link isBlessedPlugin}.
 *
 * @packageDocumentation
 */

import {BLESSED_PLUGINS, type BlessedPlugin} from '#plugin/blessed';

/**
 * Checks if the given identifier is a {@link BlessedPlugin}.
 *
 * Type guard.
 *
 * @param id The identifier to check.
 * @returns `true` if the identifier is a {@link BlessedPlugin}, `false`
 *   otherwise.
 */

export const isBlessedPlugin = (id: unknown): id is BlessedPlugin =>
  BLESSED_PLUGINS.includes(id as BlessedPlugin);
