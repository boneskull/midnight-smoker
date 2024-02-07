/* eslint-disable @typescript-eslint/no-base-to-string */
/**
 * Provides {@link loadPackageManagers}, which matches the known `PkgManager`
 * implementations to the requested package manager specification(s).
 *
 * @packageDocumentation
 */

import {type PkgManagerDef} from '#schema/pkg-manager-def.js';
import {curry, isFunction, isString} from 'lodash';
import {Range} from 'semver';
import {InvalidArgError} from '../../error';
import {UnsupportedPackageManagerError} from '../../error/unsupported-pkg-manager-error';
import {type Executor} from '../schema/executor';
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

export type PkgManagerDefExecutorPair = [PkgManagerDef, Executor];

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
 * @todo Note that `PkgManagerDef` is actually
 *   `Component<PkgManagerDef>`...except in the tests.
 *
 * @todo We should probably check _all_ requested package managers and collect
 *   the ones that we can't handle--instead of just throwing on the first one
 *
 * @todo `PackageManager` should be `Component<PackageManager>` for
 *   identification/debugging purposes. May enable future capabilities. Not sure
 *   how involved that will be.
 */
export async function loadPackageManagers(
  pkgManagerDefs: PkgManagerDef[],
  opts: LoadPackageManagersOpts = {},
): Promise<Map<Readonly<PkgManagerSpec>, PkgManagerDef>> {
  const {cwd = process.cwd(), desiredPkgManagers = []} = opts;
  const specs: Readonly<PkgManagerSpec>[] = !desiredPkgManagers.length
    ? [await guessPackageManager(pkgManagerDefs, cwd)]
    : await Promise.all(
        desiredPkgManagers.map((desiredSpec) =>
          PkgManagerSpec.from(desiredSpec),
        ),
      );

  return findPackageManagers(pkgManagerDefs, specs);
}

const matchPkgManager = curry(
  /**
   * Determines whether a package manager definition can serve as a package
   * manager for the requested definition
   *
   * @param spec Package manager specification
   * @param pkgManagerDef Package manager definition
   * @returns `true` if the package manager definition can handle the package
   */
  (spec: PkgManagerSpec, pkgManagerDef: PkgManagerDef): boolean => {
    if (pkgManagerDef.bin !== spec.pkgManager) {
      return false;
    }
    if (isString(pkgManagerDef.accepts)) {
      return new Range(pkgManagerDef.accepts, {includePrerelease: true}).test(
        spec.semver!,
      );
    }
    if (isFunction(pkgManagerDef.accepts)) {
      return pkgManagerDef.accepts(spec.semver!);
    }

    /* c8 ignore next */
    return false;
  },
);

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
export function findPackageManagers(
  pkgManagerDefs: PkgManagerDef[],
  pkgManagerSpecs: Readonly<PkgManagerSpec>[],
): Map<PkgManagerSpec, PkgManagerDef> {
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

  return pkgManagerSpecs.reduce<Map<PkgManagerSpec, PkgManagerDef>>(
    (acc, spec) => {
      const accepts = matchPkgManager(spec);
      const pmm = pkgManagerDefs.find(accepts);

      if (!pmm) {
        throw new UnsupportedPackageManagerError(
          `No PackageManager component found that can handle "${spec}"`,
          spec.pkgManager,
          spec.version,
        );
      }
      acc.set(spec, pmm);
      return acc;
    },
    new Map(),
  );
}
