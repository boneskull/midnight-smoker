/**
 * I guess this is a way we can determine our root directory?
 *
 * @packageDocumentation
 */

import path from 'node:path';

/**
 * The root directory of the project's sources.
 *
 * For purposes of determining debug namespaces; see `createDebug` in
 * `util/util.ts`
 */
export const ROOT = __dirname;

/**
 * Used for adulterating paths in stack traces
 */
export const SOURCE_ROOT = ROOT.replace(
  new RegExp(`(?<=midnight-smoker)${path.sep}dist${path.sep}`),
  '',
);
