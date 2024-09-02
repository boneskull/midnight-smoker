import {type NormalizedPackageJson} from '#schema/package-json';
import {type WorkspaceInfo} from '#schema/workspace-info';

/**
 * Information about a package to be linted.
 */
export type LintManifest = Readonly<{
  installPath: string;
  pkgJson: NormalizedPackageJson;
  pkgJsonPath: string;
  pkgName: string;
  workspace: WorkspaceInfo;
}>;
