import {AggregateUnsupportedPkgManagerError} from '#error/aggregate-pkg-manager-error';
import {UnsupportedPackageManagerError} from '#error/unsupported-pkg-manager-error';
import {
  type PkgManagerDef,
  type PkgManagerDefSpec,
} from '#schema/pkg-manager-def';
import {assertNonEmptyArray, type NonEmptyArray} from '#util/util';
import {curry} from 'lodash';
import {type SemVer} from 'semver';
import {type PkgManagerSpec} from './pkg-manager-spec';

/**
 * Determines whether a package manager definition can serve as a package
 * manager for the requested definition
 *
 * @param spec Package manager specification
 * @param def Package manager definition
 * @returns A {@link PkgManagerDefSpec} object
 */
function _matchPkgManager(
  spec: PkgManagerSpec,
  def: PkgManagerDef,
): PkgManagerDefSpec | undefined {
  let version: SemVer | string | undefined;
  if (def.bin === spec.pkgManager && (version = def.accepts(spec.version))) {
    return {spec: spec.clone({version}), def};
  }
}

/**
 * {@inheritDoc _matchPkgManager}
 */
const matchPkgManager = curry(_matchPkgManager);

/**
 * Finds package managers based on the provided package manager modules and
 * specifications.
 *
 * @param pkgManagerDefs - An array of package manager modules.
 * @param pkgManagerSpecs - An array of package manager specifications.
 * @returns A map of package manager specs to their corresponding package
 *   manager modules.
 * @throws `UnsupportedPackageManagerError` if no package manager is found that
 *   can handle the specified name and version.
 * @todo I forget why I made this a separate function. Clue to self: I thought I
 *   wanted it in the tests for some reason.
 */

export const matchPkgManagers = (
  pkgManagerDefs: NonEmptyArray<PkgManagerDef>,
  pkgManagerSpecs: NonEmptyArray<Readonly<PkgManagerSpec>>,
) => {
  const errors: UnsupportedPackageManagerError[] = [];
  const defSpecs: PkgManagerDefSpec[] = [];

  for (const spec of pkgManagerSpecs) {
    const matchSpec = matchPkgManager(spec);
    let defSpec: PkgManagerDefSpec | undefined;

    // this is too clever but I'm leaving it
    if (
      pkgManagerDefs.some((def) => {
        defSpec = matchSpec(def);
        return defSpec;
      })
    ) {
      defSpecs.push(defSpec!);
    } else {
      errors.push(
        new UnsupportedPackageManagerError(
          `No package manager implementation found that can handle "${spec}"`,
          spec.pkgManager,
          spec.version,
        ),
      );
    }
  }

  if (errors.length) {
    throw new AggregateUnsupportedPkgManagerError(errors);
  }

  // this shouldn't actually be needed due to the logic above, but here we are
  assertNonEmptyArray(defSpecs);

  return defSpecs;
};
