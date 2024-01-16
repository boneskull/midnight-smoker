/* eslint-disable @typescript-eslint/no-base-to-string */
/**
 * Provides {@link loadPackageManagers}.
 *
 * @packageDocumentation
 */

import {curry, isFunction, isString} from 'lodash';
import {Range} from 'semver';
import {InvalidArgError} from '../../error';
import * as Helpers from '../../plugin/helpers';
import type {Executor} from '../executor/executor';
import {UnsupportedPackageManagerError} from './errors/unsupported-pkg-manager-error';
import {guessPackageManager} from './guesser';
import type {PkgManager} from './pkg-manager-schema';
import {PkgManagerSpec} from './pkg-manager-spec';
import type {PkgManagerDef, PkgManagerOpts} from './pkg-manager-types';

// const debug = Debug('midnight-smoker:pm:loader');

/**
 * Options for {@link loadPackageManagers}.
 */
export interface LoadPackageManagersOpts extends PkgManagerOpts {
  /**
   * This can be specified to avoid matching the package manager specs to the
   * package manager modules a second time.
   */
  pmModuleMap?: Map<PkgManagerSpec, PkgManagerDef>;

  /**
   * Current working directory (where `smoker` is run)
   */
  cwd?: string;
}

/**
 * Makes {@link PkgManager PackageManagers} out of
 * {@link PkgManagerDef PkgManagerDefs}.
 *
 * If a `package.json` contains a `packageManager` field, and no package manager
 * was spec was provided to this function, then value of the `packageManager`
 * field will be used.
 *
 * @param pkgManagerDefs - An array of `PkgManagerDef` objects.
 * @param executor - The {@link Executor} provided to each {@link PkgManager}
 * @param desiredSpecs - An optional array of package manager specifications of
 *   the format `<name>[@version]`. Defaults to an array containing only
 *   `'npm'`.
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
  executor: Executor,
  desiredSpecs: readonly string[] = [],
  opts: LoadPackageManagersOpts = {},
): Promise<Map<Readonly<PkgManagerSpec>, PkgManager>> {
  const {pmModuleMap, cwd = process.cwd(), ...pmOpts} = opts;
  let defsBySpec: Map<PkgManagerSpec, PkgManagerDef>;
  if (!pmModuleMap) {
    let specs: Readonly<PkgManagerSpec>[];
    if (!desiredSpecs.length) {
      specs = [await guessPackageManager(pkgManagerDefs, cwd)];
    } else {
      specs = await Promise.all(
        desiredSpecs.map(
          async (desiredSpec) => await PkgManagerSpec.from(desiredSpec),
        ),
      );
    }

    defsBySpec = await findPackageManagers(pkgManagerDefs, specs);
  } else {
    defsBySpec = pmModuleMap;
  }

  return new Map(
    await Promise.all(
      [...defsBySpec].map(
        async ([spec, def]) =>
          [spec, await def.create(spec, executor, Helpers, pmOpts)] as [
            Readonly<PkgManagerSpec>,
            PkgManager,
          ],
      ),
    ),
  );
}

const matchPkgManager = curry(
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
export async function findPackageManagers(
  pkgManagerDefs: PkgManagerDef[],
  pkgManagerSpecs: Readonly<PkgManagerSpec>[],
): Promise<Map<PkgManagerSpec, PkgManagerDef>> {
  if (!pkgManagerDefs.length) {
    throw new InvalidArgError('pkgManagerDefs must be a non-empty array', {
      argName: 'pkgManagerDefs',
      position: 0,
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
