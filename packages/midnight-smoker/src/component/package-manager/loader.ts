/* eslint-disable @typescript-eslint/no-base-to-string */
/**
 * Provides {@link loadPackageManagers}.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import {curry, isFunction, isString} from 'lodash';
import {Range, type SemVer} from 'semver';
import * as Helpers from '../../plugin/helpers';
import type {Executor} from '../executor/executor';
import {UnsupportedPackageManagerError} from './errors/unsupported-pkg-manager-error';
import type {PkgManager} from './pkg-manager-schema';
import type {PkgManagerDef, PkgManagerOpts} from './pkg-manager-types';
import {normalizeVersion} from './version';

const debug = Debug('midnight-smoker:pm:loader');

export interface LoadPackageManagersOpts extends PkgManagerOpts {
  /**
   * This can be specified to avoid matching the package manager specs to the
   * package manager modules a second time.
   */
  pmModuleMap?: Map<string, PkgManagerDef>;

  cwd?: string;
}

/**
 * The default package manager specification
 *
 * This should be the maximum version of `npm` available that our supported
 * platforms will run on.
 */
export const DEFAULT_SPEC = 'npm@9.x';

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
 * @param specs - An optional array of package manager specifications of the
 *   format `<name>[@version]`. Defaults to an array containing only `'npm'`.
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
  specs: readonly string[] = [],
  opts: LoadPackageManagersOpts = {},
): Promise<Map<string, PkgManager>> {
  const {pmModuleMap, cwd = process.cwd(), ...pmOpts} = opts;

  if (!specs.length) {
    const result = await Helpers.readPackageJson({cwd});
    specs = result?.packageJson.packageManager
      ? [result.packageJson.packageManager]
      : [DEFAULT_SPEC];
  }

  const map = pmModuleMap ?? findPackageManagers(pkgManagerDefs, specs);
  return new Map(
    await Promise.all(
      [...map].map<Promise<[string, PkgManager]>>(async ([spec, pmm]) => [
        spec,
        await pmm.create(spec, executor, Helpers, pmOpts),
      ]),
    ),
  );
}

const matchPkgManager = curry(
  (name: string, version: SemVer, pkgManagerDef: PkgManagerDef): boolean => {
    if (pkgManagerDef.bin !== name) {
      return false;
    }
    if (isString(pkgManagerDef.accepts)) {
      return new Range(pkgManagerDef.accepts, {includePrerelease: true}).test(
        version,
      );
    }
    if (isFunction(pkgManagerDef.accepts)) {
      return pkgManagerDef.accepts(version);
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
export function findPackageManagers(
  pkgManagerDefs: PkgManagerDef[],
  pkgManagerSpecs: readonly string[],
): Map<string, PkgManagerDef> {
  const nameVersionPairs = pkgManagerSpecs.map<[string, SemVer]>((pm) => {
    const [name, version] = pm.split('@');
    return [name, normalizeVersion(name, version)];
  });

  debug(
    'Requested PM specs: %O',
    nameVersionPairs.flatMap(([name, version]) => `${name}@${version}`),
  );

  return nameVersionPairs.reduce<Map<string, PkgManagerDef>>(
    (acc, [name, version]) => {
      const accepts = matchPkgManager(name, version);
      const pmm = pkgManagerDefs.find(accepts);

      if (!pmm) {
        throw new UnsupportedPackageManagerError(
          `No package manager found that can handle ${name}@${version}`,
          name,
          `${version}`,
        );
      }
      acc.set(`${name}@${version}`, pmm);
      return acc;
    },
    new Map(),
  );
}
