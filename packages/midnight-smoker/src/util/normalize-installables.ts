/**
 * Provides {@link normalizeInstallables}
 *
 * @packageDocumentation
 */

import {type WorkspaceInfo} from '#schema/workspace-info';

/**
 * Fields in `package.json` that might have a dependency we want to install as
 * an isolated package to help run smoke tests.
 *
 * @remarks
 * Order is important; changing this should be a breaking change
 */
const DEP_FIELDS = [
  'devDependencies',
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/**
 * Regex string to match a package name.
 *
 * Used by {@link PKG_NAME_REGEX} and {@link PKG_NAME_WITH_SPEC_REGEX}.
 */
const PKG_NAME_REGEX_STR =
  '^(@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*';

/**
 * Regex to match a package name without a spec
 */
const PKG_NAME_REGEX = new RegExp(`${PKG_NAME_REGEX_STR}$`);

/**
 * Regex to match a package name with a spec.
 *
 * @remarks
 * This does not attempt to validate a semver string, though it could. If it
 * did, it'd also need to allow any valid package tag. I'm not sure what the
 * latter is, but the former can be found on
 * {@link https://stackoverflow.com/a/72900791|StackOverflow}.
 */
const PKG_NAME_WITH_SPEC_REGEX = new RegExp(`${PKG_NAME_REGEX_STR}@.+$`);

/**
 * For any of `requestedInstallables` without specified versions, look through
 * those referenced in each {@link WorkspaceInfo.pkgJson} and try to match a
 * version.
 *
 * @param requestedInstallables List of requested dependencies (anything
 *   installable by a package manager)
 * @param workspaceInfo Workspace information
 * @returns Normalized list of dependencies
 */
export function normalizeInstallables(
  requestedInstallables: string[],
  workspaceInfo: WorkspaceInfo[],
) {
  return requestedInstallables.map((installable) => {
    if (PKG_NAME_WITH_SPEC_REGEX.test(installable)) {
      // we were given a package name with a version spec. just use it
      return installable;
    }

    if (PKG_NAME_REGEX.test(installable)) {
      // we were given a package name, no version.
      // try to see if it's in the package.json
      const pkgName = installable;

      for (const {pkgJson} of workspaceInfo) {
        for (const field of DEP_FIELDS) {
          const deps = pkgJson[field];
          if (deps?.[pkgName]) {
            // it's in the package.json somewhere, so we can
            // build the spec from the version listed in one of
            // DEP_FIELDS
            return `${pkgName}@${deps[pkgName]}`;
          }
        }
      }

      // can't find it; just use latest version
      return `${pkgName}@latest`;
    }

    // filepath, git url, etc.
    return installable;
  });
}
