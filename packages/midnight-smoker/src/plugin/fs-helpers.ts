/**
 * Filesystem-related helpers for plugins
 *
 * @packageDocumentation
 */

import {DirCreationError} from '#error/create-dir-error';
import {isErrnoException} from '#util/error-util';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

export {
  readPackageJson,
  readPackageJsonSync,
  type ReadPackageJsonNormalizedResult,
  type ReadPackageJsonOpts,
  type ReadPackageJsonResult,
} from '#util/pkg-util';

/**
 * Creates a temp dir
 *
 * @returns New temp dir path
 * @todo This should be created in `createPluginAPI()` and the prefix should
 *   include the plugin name.
 */

export async function createTempDir(prefix = TMP_DIR_PREFIX): Promise<string> {
  const fullPrefix = path.join(tmpdir(), prefix);
  try {
    return await fs.mkdtemp(fullPrefix);
  } catch (err) {
    if (isErrnoException(err)) {
      throw new DirCreationError(
        `Failed to create temp directory with prefix ${fullPrefix}`,
        fullPrefix,
        err,
      );
    }
    throw err;
  }
}
export const TMP_DIR_PREFIX = 'midnight-smoker-';
