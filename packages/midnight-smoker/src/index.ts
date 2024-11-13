/**
 * Main entry point for `midnight-smoker`.
 *
 * @module midnight-smoker
 * @example
 *
 * ```ts
 * import {smoke} from 'midnight-smoker';
 * ```
 */

import {Smoker} from './smoker';

export * from './capabilities';

export * from './constants';

export * from './error';

export * from './event';

export * from './executor';

export * from './options';

export * from './options';

export * from './pkg-manager';

export * from './plugin';

export * from './reporter';

export * from './rule';

export * from './schema';

export * from './smoker';

export * from './util';

export const {smoke} = Smoker;
