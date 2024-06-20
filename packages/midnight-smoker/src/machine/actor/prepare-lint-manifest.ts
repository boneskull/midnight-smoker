import {type LintManifest} from '#schema/lint-manifest';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type FileManager} from '#util/filemanager';
import Debug from 'debug';
import {fromPromise} from 'xstate';

const debug = Debug('midnight-smoker:machine:actor');

/**
 * Input for {@link prepareLintManifest}
 */

export interface PrepareLintManifestInput {
  fileManager: FileManager;

  workspace: WorkspaceInfo;

  installPath: string;
}

/**
 * Assigns package.json information from the installed workspace to a
 * {@link LintManifest}
 */

export const prepareLintManifest = fromPromise<
  LintManifest,
  PrepareLintManifestInput
>(async ({input: {workspace, installPath, fileManager}, signal}) => {
  debug('Searching for package.json from %s', installPath);
  const {packageJson: installedPkgJson, path: installedPkgJsonPath} =
    await fileManager.findPkgUp(installPath, {
      strict: true,
      signal,
    });
  return {
    pkgName: installedPkgJson.name ?? workspace.pkgName,
    pkgJsonPath: installedPkgJsonPath,
    pkgJson: installedPkgJson,
    workspace,
    installPath,
  };
});
