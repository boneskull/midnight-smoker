import {type PackageJson} from '#schema/package-json';
import {type WorkspaceInfo} from '#schema/workspace-info';

/**
 * Information about a package to be linted.
 */
export type LintManifest = Readonly<{
  installPath: string;
  pkgJson: PackageJson;
  pkgJsonPath: string;
  pkgName: string;
  rawPkgJson: string;
  workspace: WorkspaceInfo;
}>;
