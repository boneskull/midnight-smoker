/**
 * I guess this is a way we can determine our root directory?
 *
 * @packageDocumentation
 */

/**
 * The root directory of the project.
 *
 * For purposes of determining debug namespaces; see `createDebug` in
 * `util/util.ts`
 *
 * @internal
 */
export const ROOT = __dirname;

export const SOURCE_ROOT = ROOT.replace(/(?<=midnight-smoker)\/dist/, '');
