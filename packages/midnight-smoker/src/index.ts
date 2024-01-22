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
export type {PkgManagerInstallManifest} from './component/pkg-manager/pkg-manager-schema';
export type {SmokeResults} from './event/event-types';
export {
  zBaseSmokerOptions,
  type RawSmokerOptions,
  type SmokerOptions,
} from './options';
export {Smoker};
export const {smoke} = Smoker;
