import Debug from 'debug';
import {type SemVer} from 'semver';
import type {
  PackageManager,
  PackageManagerModule,
  PackageManagerOpts,
} from './pm';

import {UnsupportedPackageManagerError} from '../error';
import {CorepackExecutor} from './corepack';
import {normalizeVersion} from './version';

const debug = Debug('midnight-smoker:pm:loader');

export function initPMLoader(builtinPms: PackageManagerModule[] = []) {
  return async function loadPackageManagers(
    pms: string[] = ['npm'],
    opts: PackageManagerOpts = {},
  ): Promise<Map<string, PackageManager>> {
    const nameVersionPairs = await Promise.all(
      pms.map(async (pm) => {
        const [name, version] = pm.split('@');
        return [name, await normalizeVersion(name, version)] as [
          name: string,
          version: SemVer,
        ];
      }),
    );

    debug(
      'Requested package managers: %O',
      nameVersionPairs.flatMap(([name, version]) => `${name}@${version}`),
    );

    const toLoad = nameVersionPairs.reduce((acc, [name, version]) => {
      const pmm = builtinPms.find(
        (pmm) => pmm.bin === name && pmm.accepts(version),
      );
      if (!pmm) {
        throw new UnsupportedPackageManagerError(
          `No package manager found that can handle ${name}@${version}`,
          name,
          version.toString(),
        );
      }
      acc.set(`${name}@${version}`, pmm);
      return acc;
    }, new Map<string, PackageManagerModule>());

    debug('Loading package managers: %O', [...toLoad.keys()]);

    const pmMap = new Map<string, PackageManager>();
    for await (const [id, pmm] of toLoad) {
      pmMap.set(id, await pmm.load(new CorepackExecutor(id), opts));
    }

    // TODO: throw if we can't find one that will handle the request
    return pmMap;
  };
}
