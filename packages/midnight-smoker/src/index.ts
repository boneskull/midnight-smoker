/**
 * Main entry point for `midnight-smoker`.
 *
 * Contains:
 *
 * - The {@link Smoker} class.
 * - The {@link smoke} function (alias for {@link Smoker.smoke}).
 * - Sundry types to support it all.
 *
 * @module midnight-smoker
 * @example
 *
 * ```ts
 * import {smoke} from 'midnight-smoker';
 * ```
 */

import {Smoker} from './smoker';

export type {SmokeResults} from '#event/smoker-events';

export {
  BaseSmokerOptionsSchema as zBaseSmokerOptions,
  type RawSmokerOptions,
  type SmokerOptions,
} from './options';

export type {SmokerCapabilities} from './smoker';

export {Smoker};

export const {smoke} = Smoker;
