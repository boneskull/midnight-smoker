/**
 * Provides {@link narrowInstallables}
 *
 * @packageDocumentation
 * @todo This might want to move out of `util` and into `machine`
 */

import {constant, TAG_LATEST} from '#constants';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {partition, uniq} from 'lodash';

import {createDebug} from './debug';

/**
 * Fields in `package.json` that might have a dependency we want to install as
 * an isolated package to help run smoke tests.
 *
 * @remarks
 * Order is important; changing this should be a breaking change
 */
const DEP_FIELDS = constant([
  'devDependencies',
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
]);

const debug = createDebug(__filename);

/**
 * Regex string to match a package name.
 *
 * Used by {@link PKG_NAME_REGEX} and {@link PKG_NAME_WITH_VERSION_OR_TAG_REGEX}.
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
const PKG_NAME_WITH_VERSION_OR_TAG_REGEX = new RegExp(
  `${PKG_NAME_REGEX_STR}@.+$`,
);

/**
 * Guesses the version of an installable package.
 *
 * If the package name is found in the `package.json` of any workspace, the
 * version listed in one of the `DEP_FIELDS` is used to build the spec. If the
 * package name is not found, the `latest` dist-tag is used.
 *
 * @param installable - The name of the installable package.
 * @param workspaceInfo - An array of workspace information objects.
 * @returns The installable package name and version in the format
 *   `<name>@<version>` where possible
 */
function guessInstallableVersion(
  installable: string,
  workspaceInfo: WorkspaceInfo[],
): string {
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
        const nameAndVersion = `${pkgName}@${deps[pkgName]}`;
        debug(
          `Guessed version for "${installable}" from package.json: ${nameAndVersion}`,
        );
        return nameAndVersion;
      }
    }
  }

  // can't find it; just use default tag
  return `${pkgName}@${TAG_LATEST}`;
}

/**
 * For any of `requestedInstallables` without specified versions, look through
 * those referenced in each {@link WorkspaceInfo.pkgJson} and try to match a
 * version.
 *
 * @param requestedInstallables List of requested dependencies (anything
 *   installable by a package manager)
 * @param workspaceInfo Workspace information
 * @returns Unique, normalized list of dependencies
 */
export function narrowInstallables(
  requestedInstallables: readonly string[],
  workspaceInfo: WorkspaceInfo[],
): readonly string[] {
  // split up the array into digestable parts

  const [installablesWithNameAndVersionOrTag, otherInstallables] = partition(
    requestedInstallables,
    (installable) => PKG_NAME_WITH_VERSION_OR_TAG_REGEX.test(installable),
  );

  const [installablesWithName, specialInstallables] = partition(
    otherInstallables,
    (installable) => PKG_NAME_REGEX.test(installable),
  );

  const guessedInstallablesWithNameAndVersionOrTag = installablesWithName.map(
    (installable) => guessInstallableVersion(installable, workspaceInfo),
  );

  return Object.freeze(
    uniq([
      ...installablesWithNameAndVersionOrTag,
      ...guessedInstallablesWithNameAndVersionOrTag,
      ...specialInstallables,
    ]),
  );
}
