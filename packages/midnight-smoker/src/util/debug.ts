/**
 * Debugging utilities.
 *
 * All modules are encouraged to use {@link createDebug} to create a debug
 * function, and responsibly litter the code with debug statements.
 *
 * @packageDocumentation
 */

import Debug from 'debug';

/**
 * Given an absolute path or arbitrary name, creates a new
 * {@link Debug.Debug Debug instance} with a namespace derived from the path.
 *
 * Namespaces always begin with `midnight-smoker` and are delimited by `:`
 *
 * @param pathOrName Absolute filepath or arbitrary name
 * @param extra Extra debug namespace parts
 * @returns A {@link Debug.Debug Debug instance}
 */

import {MIDNIGHT_SMOKER} from '#constants';
import {ROOT} from '#root';
import path from 'node:path';
import {format} from 'node:util';

/**
 * A function that is kind of like `debug`'s default export, but derives
 * namespaces from filenames.
 *
 * @example
 *
 * ```ts
 * const debug = createDebug(__filename);
 * ```
 *
 * @param pathOrName Absolute filepath or arbitrary name
 * @param extra Extra debug namespace parts
 */
export const createDebug = debugFactory();

/**
 * Factory for a function which helps create `Debug` instances.
 *
 * **Use `createDebug` instead for `midnight-smoker`**; plugins can use this if
 * desired.
 *
 * @param rootNamespace Root namespace for debugger
 * @param rootPath Root path
 * @returns A function that creates `Debug` instances
 */
export function debugFactory(
  rootNamespace = MIDNIGHT_SMOKER,
  rootPath = ROOT,
): (pathOrName: string, ...extra: string[]) => Debug.Debugger {
  return (pathOrName: string, ...extra: string[]): Debug.Debugger => {
    const relativePathOrName = path.isAbsolute(pathOrName)
      ? path.relative(rootPath, pathOrName)
      : pathOrName;

    if (process.env.WALLABY) {
      Debug.log = function debug(...args: string[]) {
        console.log(format(...args));
      };
    }

    /**
     * If `relativePathOrName` is not an absolute path, then `dir` will be an
     * empty string
     */
    const {dir, name} = path.parse(relativePathOrName);
    const dirParts = dir ? dir.split(path.sep) : [];
    const args = [...dirParts, name, ...extra];
    const debug = Debug([rootNamespace, ...args].join(':'));

    return debug;
  };
}
