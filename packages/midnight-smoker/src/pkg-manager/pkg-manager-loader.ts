/* eslint-disable @typescript-eslint/no-base-to-string */
/**
 * Provides {@link loadPackageManagers}, which matches the known `PkgManager`
 * implementations to the requested package manager specification(s).
 *
 * @packageDocumentation
 */

import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type WorkspaceInfo} from '#schema/workspaces';
import {type NonEmptyArray} from '#util/util';
import {matchPkgManagers} from './pkg-manager-matcher';
import {PkgManagerSpec, type PkgManagerDefSpec} from './pkg-manager-spec';

/**
 * Options for {@link loadPackageManagers}.
 */
export interface LoadPackageManagersOpts {
  /**
   * Current working directory (where `smoker` is run)
   */
  cwd?: string;

  /**
   * List of desired package managers. If not provided, then
   * {@link loadPackageManagers} will guess what to use by analyzing the
   * filesystem.
   */
  desiredPkgManagers?: Array<string | Readonly<PkgManagerSpec>>;
}

/**
 * Makes {@link PkgManager PackageManagers} out of
 * {@link PkgManagerDef PkgManagerDefs}.
 *
 * If a `package.json` contains a `packageManager` field, and no package manager
 * was spec was provided to this function, then value of the `packageManager`
 * field will be used.
 *
 * @param defs - An array of `PkgManagerDef` objects (provided by plugins)
 * @param opts - Optional package manager options.
 * @returns A Promise that resolves to a Map of specs to package manager
 *   instances.
 * @internal
 */
export async function loadPackageManagers(
  defs: NonEmptyArray<PkgManagerDef>,
  workspaceInfo: WorkspaceInfo[],
  opts: LoadPackageManagersOpts = {},
): Promise<NonEmptyArray<PkgManagerDefSpec>> {
  const {cwd, desiredPkgManagers = []} = opts;
  const specs = await PkgManagerSpec.fromPkgManagerDefs(defs, {
    desiredPkgManagers,
    cwd,
    workspaceInfo,
  });
  return matchPkgManagers(defs, specs);
}
