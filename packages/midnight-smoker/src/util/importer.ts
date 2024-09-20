import {isObject} from '#util/guard/common';
import {Module} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {createDebug} from './debug';

const debug = createDebug(__filename);

/**
 * A function that imports a module asynchronously (like `import()`)
 */
export type ImportFn = (moduleId: string | URL) => Promise<unknown>;

/**
 * Attempts to gracefully load an unknown module.
 *
 * `await import()` on a CJS module will always return an object with a
 * `default` export. Modules which have been, say, compiled with TS into CJS and
 * _also_ have a default export will be wrapped in _another_ `default` property.
 * That sucks, but it can be avoided by just `require`-ing the CJS module
 * instead. We will still need to unwrap the `default` property if it exists.
 *
 * The `pkgJson` parameter is used to help us guess at the type of module we're
 * importing.
 *
 * @param moduleId - Resolved module identifier
 * @param pkgJson - `package.json` associated with the module, if any
 * @returns Hopefully, whatever is exported
 */
export const mimport: ImportFn = async (
  moduleId: string | URL,
): Promise<unknown> => {
  // no zalgo here

  await Promise.resolve();
  if (moduleId instanceof URL) {
    moduleId = fileURLToPath(moduleId);
  }

  if (!path.isAbsolute(moduleId)) {
    // TODO throw SmokeError
    throw new TypeError(
      `moduleId must be absolute; got: ${moduleId}. This is a bug`,
    );
  }

  const moduleUrl = pathToFileURL(moduleId);
  debug('Attempting import: %s', moduleUrl);
  let raw: unknown = await import(`${moduleUrl}`);

  // unwrap default export of CJS modules
  if (raw && isObject(raw) && 'default' in raw) {
    raw = raw.default;
  }
  return raw;
};

/**
 * Resolves module at `moduleId` from `fromDir` dir
 *
 * @param moduleId - Module identifier
 * @param fromDir - Dir to resolve from; defaults to CWD
 * @returns Resolved module path
 */

export function resolveFrom(
  moduleId: string | URL,
  fromDir: string | URL = process.cwd(),
): string {
  if (moduleId instanceof URL) {
    moduleId = fileURLToPath(moduleId);
  }
  if (fromDir instanceof URL) {
    fromDir = fileURLToPath(fromDir);
  }
  return Module.createRequire(path.join(fromDir, 'index.js')).resolve(moduleId);
}
