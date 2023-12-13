/* eslint-disable @typescript-eslint/no-base-to-string */
/**
 * Provides {@link loadPackageManagers}.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import type {SemVer} from 'semver';
import {UnsupportedPackageManagerError} from '../../error/pkg-manager-error';
import * as Helpers from '../../plugin/helpers';
import type {Executor} from '../executor';
import type {PackageManager} from '../schema/pkg-manager-schema';
import type {
  PackageManagerModule,
  PackageManagerOpts,
} from './pkg-manager-types';
import {normalizeVersion} from './version';

const debug = Debug('midnight-smoker:pm:loader');

export interface LoadPackageManagersOpts extends PackageManagerOpts {
  /**
   * This can be specified to avoid matching the package manager specs to the
   * package manager modules a second time.
   */
  pmModuleMap?: Map<string, PackageManagerModule>;

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
 * Makes {@link PackageManager PackageManagers} out of
 * {@link PackageManagerModule PackageManagerModules}.
 *
 * If a `package.json` contains a `packageManager` field, and no package manager
 * was spec was provided to this function, then value of the `packageManager`
 * field will be used.
 *
 * @param pkgManagerModules - An array of PackageManagerModule objects.
 * @param executor - The {@link Executor} provided to each {@link PackageManager}
 * @param specs - An optional array of package manager specifications of the
 *   format `<name>[@version]`. Defaults to an array containing only `'npm'`.
 * @param opts - Optional package manager options.
 * @returns A Promise that resolves to a Map of specs to package manager
 *   instances.
 * @internal
 * @todo Note that `PackageManagerModule` is actually
 *   `Component<PackageManagerModule>`...except in the tests.
 *
 * @todo We should probably check _all_ requested package managers and collect
 *   the ones that we can't handle--instead of just throwing on the first one
 *
 * @todo `PackageManager` should be `Component<PackageManager>` for
 *   identification/debugging purposes. May enable future capabilities. Not sure
 *   how involved that will be.
 */
export async function loadPackageManagers(
  pkgManagerModules: PackageManagerModule[],
  executor: Executor,
  specs: readonly string[] = [],
  opts: LoadPackageManagersOpts = {},
): Promise<Map<string, PackageManager>> {
  const {pmModuleMap, cwd = process.cwd(), ...pmOpts} = opts;

  if (!specs.length) {
    const result = await Helpers.readPackageJson({cwd});
    specs = result?.packageJson.packageManager
      ? [result.packageJson.packageManager]
      : [DEFAULT_SPEC];
  }

  const map = pmModuleMap ?? findPackageManagers(pkgManagerModules, specs);
  return new Map(
    await Promise.all(
      [...map].map<Promise<[string, PackageManager]>>(async ([spec, pmm]) => [
        spec,
        await pmm.create(spec, executor, Helpers, pmOpts),
      ]),
    ),
  );
}

/**
 * Finds package managers based on the provided package manager modules and
 * specifications.
 *
 * @param pkgManagerModules - An array of package manager modules.
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
  pkgManagerModules: PackageManagerModule[],
  pkgManagerSpecs: readonly string[],
): Map<string, PackageManagerModule> {
  const nameVersionPairs = pkgManagerSpecs.map<[string, SemVer]>((pm) => {
    const [name, version] = pm.split('@');
    return [name, normalizeVersion(name as 'npm' | 'yarn', version)];
  });

  debug(
    'Requested PM specs: %O',
    nameVersionPairs.flatMap(([name, version]) => `${name}@${version}`),
  );

  return nameVersionPairs.reduce<Map<string, PackageManagerModule>>(
    (acc, [name, version]) => {
      const pmm = pkgManagerModules.find(
        (pmm) => pmm.bin === name && pmm.accepts(version),
      );
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
