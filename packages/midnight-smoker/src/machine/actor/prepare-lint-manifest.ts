import {type LintManifest} from '#rule/lint-manifest';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {createDebug} from '#util/debug';
import {type FileManager} from '#util/filemanager';
import {fromPromise} from 'xstate';

const debug = createDebug(__filename);

/**
 * Input for {@link prepareLintManifestLogic}
 */

export interface PrepareLintManifestLogicInput {
  fileManager: FileManager;
  installPath: string;
  workspace: WorkspaceInfo;
}

/**
 * Assigns package.json information from the installed workspace to a
 * {@link LintManifest}
 */

export const prepareLintManifestLogic = fromPromise<
  LintManifest,
  PrepareLintManifestLogicInput
>(async ({input: {fileManager, installPath, workspace}, signal}) => {
  debug('Searching for package.json from %s', installPath);
  const {
    packageJson: installedPkgJson,
    path: installedPkgJsonPath,
    rawPackageJson: pkgJsonSource,
  } = await fileManager.findPkgUp(installPath, {
    normalize: true,
    signal,
    strict: true,
  });

  const manifest: LintManifest = {
    installPath,
    pkgJson: installedPkgJson,
    pkgJsonPath: installedPkgJsonPath,
    pkgJsonSource,
    pkgName: installedPkgJson.name ?? workspace.pkgName,
    workspace,
  };

  return manifest;
});
