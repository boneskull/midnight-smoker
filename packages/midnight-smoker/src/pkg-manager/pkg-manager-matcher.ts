import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {assertNonEmptyArray, type NonEmptyArray} from '#util/util';
import {curry} from 'lodash';
import {type SemVer} from 'semver';
import {type PkgManagerDefSpec, type PkgManagerSpec} from './pkg-manager-spec';

/**
 * Determines whether a package manager definition can serve as a package
 * manager for the requested definition
 *
 * @param spec Package manager specification
 * @param def Package manager definition
 * @returns A {@link PkgManagerDefSpec} object
 */
function _matchPkgManager(
  spec: Readonly<PkgManagerSpec>,
  def: PkgManagerDef,
): Readonly<PkgManagerSpec> | undefined {
  let version: SemVer | string | undefined;
  if (def.bin === spec.bin && (version = def.accepts(spec.version))) {
    return spec.clone({version});
  }
}

/**
 * {@inheritDoc _matchPkgManager}
 */
const matchPkgManager = curry(_matchPkgManager, 2);

/**
 * Finds package managers based on the provided package manager modules and
 * specifications.
 *
 * @param pkgManagerDefs - An array of package manager modules.
 * @param pkgManagerSpecs - An array of package manager specifications.
 * @returns Array of package manager definitions and specifications
 * @internal
 */
export const matchPkgManagers = (
  pkgManagerDefs: NonEmptyArray<PkgManagerDef>,
  pkgManagerSpecs: NonEmptyArray<Readonly<PkgManagerSpec>>,
): PkgManagerDefSpec[] => {
  assertNonEmptyArray(pkgManagerDefs);
  assertNonEmptyArray(pkgManagerSpecs);
  return pkgManagerSpecs.reduce<PkgManagerDefSpec[]>((defSpecs, spec) => {
    const matchSpec = matchPkgManager(spec);
    for (const def of pkgManagerDefs) {
      // this is a NEW spec with a potentially resolved/normalized version
      const spec = matchSpec(def);
      if (spec) {
        return [...defSpecs, {def, spec}];
      }
    }

    return defSpecs;
  }, []);
};
