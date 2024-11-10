import {SYSTEM} from '#constants';
import {
  getDesiredPkgManagerFromPackageJson,
  getPkgManagerFromLockfile,
} from '#pkg-manager/inspect';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type DesiredPkgManager} from '#schema/desired-pkg-manager';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type FileManager} from '#util/filemanager';
import {isDesiredPkgManager} from '#util/guard/desired-pkg-manager';
import {fromPromise} from 'xstate';

export type GuessPkgManagerLogicInput = {
  fileManager: FileManager;
  plugins: Readonly<PluginMetadata>[];
  workspaceInfo: WorkspaceInfo[];
};

export const guessPkgManagerLogic = fromPromise<
  DesiredPkgManager,
  GuessPkgManagerLogicInput
>(async ({input: {fileManager, plugins, workspaceInfo}}) => {
  const pkgManagers = plugins.flatMap((plugin) => plugin.pkgManagers);

  let desiredPkgManager: DesiredPkgManager | undefined;

  for (const workspace of workspaceInfo) {
    // Check for a `packageManager` field in the workspace's `package.json`.
    // if it's there, use it.
    const allegedDesiredPkgManager =
      getDesiredPkgManagerFromPackageJson(workspace);

    if (isDesiredPkgManager(allegedDesiredPkgManager)) {
      desiredPkgManager = allegedDesiredPkgManager;
      break;
    }

    // sniff around for lockfiles to determine the package manager
    const maybePkgManager = await getPkgManagerFromLockfile(
      pkgManagers,
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
