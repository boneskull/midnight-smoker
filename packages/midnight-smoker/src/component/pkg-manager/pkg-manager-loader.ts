/* eslint-disable @typescript-eslint/no-base-to-string */
/**
 * Provides {@link loadPackageManagers}, which matches the known `PkgManager`
 * implementations to the requested package manager specification(s).
 *
 * @packageDocumentation
 */

import {InvalidArgError} from '#error/invalid-arg-error';
import {UnsupportedPackageManagerError} from '#error/unsupported-pkg-manager-error';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {curry} from 'lodash';
import {type SemVer} from 'semver';
import {guessPackageManager} from './pkg-manager-guesser';
import {PkgManagerSpec} from './pkg-manager-spec';

// const debug = Debug('midnight-smoker:pm:loader');

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

export interface PkgManagerDefSpec {
  spec: PkgManagerSpec;
  def: PkgManagerDef;
}

/**
 * Makes {@link PkgManager PackageManagers} out of
 * {@link PkgManagerDef PkgManagerDefs}.
 *
 * If a `package.json` contains a `packageManager` field, and no package manager
 * was spec was provided to this function, then value of the `packageManager`
 * field will be used.
 *
 * @param pkgManagerDefs - An array of `PkgManagerDef` objects (provided by
 *   plugins)
 * @param opts - Optional package manager options.
 * @returns A Promise that resolves to a Map of specs to package manager
 *   instances.
 * @internal
 * @todo Note that `PkgManagerDef` is actually `PkgManagerDef`...except in the
 *   tests.
 *
 * @todo We should probably check _all_ requested package managers and collect
 *   the ones that we can't handle--instead of just throwing on the first one
 *
 * @todo `PackageManager` should be `PackageManager` for
 *   identification/debugging purposes. May enable future capabilities. Not sure
 *   how involved that will be.
 */
export async function loadPackageManagers(
  pkgManagerDefs: PkgManagerDef[],
  opts: LoadPackageManagersOpts = {},
): Promise<PkgManagerDefSpec[]> {
  const {cwd = process.cwd(), desiredPkgManagers = []} = opts;
  const specs = await getPkgManagerSpecs(
    pkgManagerDefs,
    desiredPkgManagers,
    cwd,
  );

  return matchPkgManagers(pkgManagerDefs, specs);
}

export async function getPkgManagerSpecs(
  defs: PkgManagerDef[],
  desiredPkgManagers: Array<string | Readonly<PkgManagerSpec>> = [],
  cwd = process.cwd(),
): Promise<Readonly<PkgManagerSpec>[]> {
  return !desiredPkgManagers.length
    ? [await guessPackageManager(defs, cwd)]
    : await Promise.all(
        desiredPkgManagers.map((desiredSpec) =>
          PkgManagerSpec.from(desiredSpec),
        ),
      );
}

/**
 * Determines whether a package manager definition can serve as a package
 * manager for the requested definition
 *
 * @param spec Package manager specification
 * @param pkgManagerDef Package manager definition
 * @returns `true` if the package manager definition can handle the package
 */
const _matchPkgManager = (
  spec: PkgManagerSpec,
  pkgManagerDef: PkgManagerDef,
): SemVer | string | undefined => {
  if (pkgManagerDef.bin === spec.pkgManager) {
    return pkgManagerDef.accepts(spec.version);
  }
};

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
 *
 * @todo Remove hardcoded package manager names; replace with whatever
 *   {@link normalizeVersion} has access to
 */
export function matchPkgManagers(
  pkgManagerDefs: PkgManagerDef[],
  pkgManagerSpecs: Readonly<PkgManagerSpec>[],
): PkgManagerDefSpec[] {
  if (!pkgManagerDefs?.length) {
    throw new InvalidArgError('pkgManagerDefs must be a non-empty array', {
      argName: 'pkgManagerDefs',
      position: 0,
    });
  }
  if (!pkgManagerSpecs?.length) {
    throw new InvalidArgError('pkgManagerSpecs must be a non-empty array', {
      argName: 'pkgManagerSpecs',
      position: 1,
    });
  }

  return pkgManagerSpecs.map((spec) => {
    let def: PkgManagerDef | undefined;
    let normalizedVersion: SemVer | string | undefined;

    for (const pmDef of pkgManagerDefs) {
      const value = matchPkgManager(spec, pmDef);
      if (value) {
        def = pmDef;
        normalizedVersion = value;
        break;
      }
    }

    if (!def) {
      throw new UnsupportedPackageManagerError(
        `No PackageManager component found that can handle "${spec}"`,
        spec.pkgManager,
        spec.version,
      );
    }
    return {spec: spec.clone({version: normalizedVersion}), def};
  });
}
