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
export type {PkgManagerInstallManifest} from '#schema/install-manifest';
export type {SmokeResults} from '#schema/smoker-event';
export type * from './controller';
export {
  BaseSmokerOptionsSchema as zBaseSmokerOptions,
  type RawSmokerOptions,
  type SmokerOptions,
} from './options';
export type * from './plugin/plugin-registry';
export type {SmokerCapabilities} from './smoker';
export {Smoker};
export const {smoke} = Smoker;
