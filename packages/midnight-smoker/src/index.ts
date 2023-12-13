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
 * @packageDocumentation
 */

import {Smoker} from './smoker';
export {PkgManagerInstallManifest} from './component/schema/pkg-manager-schema';
export type {SmokeResults} from './event/event-types';
export type * from './options';
export {Smoker};
export const {smoke} = Smoker;
