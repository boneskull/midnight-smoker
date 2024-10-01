import {SYSTEM} from '#constants';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type DesiredPkgManager} from '#schema/desired-pkg-manager';
import {type PkgManager} from '#schema/pkg-manager';
import {type WorkspaceInfo} from '#schema/workspace-info';
import * as assert from '#util/assert';
import {type FileManager} from '#util/filemanager';
import {isString} from '#util/guard/common';
import {isDesiredPkgManager} from '#util/guard/desired-pkg-manager';
import * as hwp from '#util/hwp';
import {filter, groupBy, head} from 'lodash';
import path from 'node:path';
import {fromPromise} from 'xstate';

export type GuessPkgManagerLogicInput = {
  fileManager: FileManager;
  plugins: Readonly<PluginMetadata>[];
  workspaceInfo: WorkspaceInfo[];
};

/**
 * Check {@link WorkspaceInfo.pkgJson} for a `packageManager` field, and return
 * it if present and non-empty.
 *
 * @param cwd Workspace directory
 * @returns The contents of field `packageManager` specified in the workspace's
 *   `package.json` file, if any
 */
function getPkgManagerFromPackageJson({
  pkgJson,
}: WorkspaceInfo): string | undefined {
  if (pkgJson.packageManager && isString(pkgJson.packageManager)) {
    return pkgJson.packageManager;
  }
}

/**
 * {@link PkgManager}s may define a lockfile name. This searches for a matching
 * lockfile on disk.
 *
 * Used to determine the "default" package manager if one is unspecified.
 *
 * @param lockfileMap Mapping of lockfile names to package managers
 * @param fileManager `FileManager` instance
 * @param cwd Path to workspace
 * @returns A `PkgManager` if a matching lockfile is found
 */
async function getPkgManagerFromLockfile(
  lockfileMap: Readonly<Record<string, PkgManager[]>>,
  fileManager: FileManager,
  cwd: string,
): Promise<PkgManager | undefined> {
  const patterns = Object.keys(lockfileMap);

  return await hwp.find(
    fileManager.globIterate(patterns, {
      cwd,
      fs: fileManager.fs,
    }),
    async (lockfilePath, {signal}) => {
      if (signal.aborted) {
        return;
      }
      const lockfile = path.basename(lockfilePath);
      const pkgManagers = lockfileMap[lockfile];
      assert.ok(pkgManagers, 'Unknown lockfile');
      return head(pkgManagers);
    },
  );
}

export const guessPkgManagerLogic = fromPromise<
  DesiredPkgManager,
  GuessPkgManagerLogicInput
>(async ({input: {fileManager, plugins, workspaceInfo}}) => {
  const pkgManagers = plugins.flatMap((plugin) => plugin.pkgManagers);

  /**
   * Grouping of lockfile name to package managers.
   *
   * Lazily loaded. Package managers can share lockfile names.
   */
  let pkgManagersByLockfile: Readonly<Record<string, PkgManager[]>>;
  let desiredPkgManager: DesiredPkgManager | undefined;

  for (const workspace of workspaceInfo) {
    const allegedDesiredPkgManager = getPkgManagerFromPackageJson(workspace);

    if (isDesiredPkgManager(allegedDesiredPkgManager)) {
      desiredPkgManager = allegedDesiredPkgManager;
      break;
    }
    pkgManagersByLockfile ??= Object.freeze(
      groupBy(filter(pkgManagers, 'lockfile'), 'lockfile'),
    );

    const maybePkgManager = await getPkgManagerFromLockfile(
      pkgManagersByLockfile,
      fileManager,
      workspace.localPath,
    );

    if (maybePkgManager) {
      desiredPkgManager = `${maybePkgManager.name}@${SYSTEM}`;
      break;
    }
  }

  return desiredPkgManager ?? SYSTEM;
});
