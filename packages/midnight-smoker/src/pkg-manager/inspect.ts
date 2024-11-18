import {DEFAULT_PKG_MANAGER_NAME} from '#constants';
import {type PkgManager} from '#defs/pkg-manager';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type FileManager} from '#util/filemanager';
import {isString} from '#util/guard/common';
import {flatMap} from '#util/hwp';
import {memoize} from '#util/memoize';
import assert from 'node:assert';
import path from 'node:path';
import {filter, groupBy} from 'remeda';

/**
 * Check {@link WorkspaceInfo.pkgJson} for a `packageManager` field, and return
 * it if present and non-empty.
 *
 * @param cwd Workspace directory
 * @returns The contents of field `packageManager` specified in the workspace's
 *   `package.json` file, if any
 */
export function getDesiredPkgManagerFromPackageJson({
  pkgJson,
}: WorkspaceInfo): string | undefined {
  if (pkgJson.packageManager && isString(pkgJson.packageManager)) {
    return pkgJson.packageManager;
  }
}

/**
 * Because {@link getPkgManagerFromLockfile} is going to be called in a loop with
 * the same array of `PkgManager`s, we can memoize the result.
 */
const getLockfileMap = memoize(
  (pkgManagers: PkgManager[]): Readonly<Record<string, PkgManager[]>> =>
    Object.freeze(
      groupBy(
        filter(pkgManagers, (pkgManager) => !!pkgManager.lockfile),
        (pkgManager) => pkgManager.lockfile,
      ),
    ),
);

/**
 * {@link PkgManager}s may define a lockfile name. This searches for a matching
 * lockfile on disk.
 *
 * Note that multiple `PkgManager`s may use the same lockfile
 *
 * Used to determine the "default" package manager if one is unspecified.
 *
 * @param pkgManagers Array of `PkgManager`s
 * @param fileManager `FileManager` instance
 * @param cwd Path to workspace
 * @returns A `PkgManager` if a matching lockfile is found
 */
export async function getPkgManagerFromLockfile(
  pkgManagers: PkgManager[],
  fileManager: FileManager,
  cwd: string,
): Promise<PkgManager | undefined> {
  const lockfileMap = getLockfileMap(pkgManagers);
  const patterns = Object.keys(lockfileMap);

  const found = await flatMap(
    fileManager.globIterate(patterns, {
      cwd,
      fs: fileManager.fs,
    }),
    async (lockfilePath, {signal}) => {
      if (signal.aborted) {
        return [];
      }
      const lockfile = path.basename(lockfilePath);
      const pkgManagers = lockfileMap[lockfile];
      assert.ok(
        pkgManagers,
        `No package manager found with lockfile: ${lockfile}; this is a bug`,
      );
      return pkgManagers;
    },
  );

  return found.find(({name}) => name === DEFAULT_PKG_MANAGER_NAME) ?? found[0];
}
