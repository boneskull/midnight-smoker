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

import {Smoker} from './smoker.js';

export * from './capabilities.js';

export * from './constants/index.js';

export * from './error/index.js';

export * from './event/index.js';

export * from './executor/index.js';

export * from './options/index.js';

export * from './options/index.js';

export * from './pkg-manager/index.js';

export * from './plugin/index.js';

export * from './reporter/index.js';

export * from './rule/index.js';

export * from './schema/index.js';

export * from './smoker.js';

export * from './util/index.js';

export const {smoke} = Smoker;
