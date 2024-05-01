import {uniquePkgNames} from '#machine/util';
import {type PkgManager} from '#pkg-manager';
import {
  type InstallEventBaseData,
  type InstallManifest,
  type RunScriptManifest,
} from '#schema';
import {filter, isEmpty, map, uniq} from 'lodash';

export function buildInstallEventData(
  pkgManagers: PkgManager[],
  manifestMap: WeakMap<PkgManager, InstallManifest[]>,
): Readonly<InstallEventBaseData> {
  const manifests = pkgManagers.flatMap(
    (pkgManager) => manifestMap.get(pkgManager) ?? [],
  );
  const additionalDeps = uniq(
    map(filter(manifests, {isAdditional: true}), 'pkgName'),
  );
  const uniquePkgs = uniquePkgNames(manifests);
  const specs = map(pkgManagers, 'staticSpec');

  return Object.freeze({
    uniquePkgs,
    pkgManagers: specs,
    additionalDeps,
    manifests,
    totalPkgs: pkgManagers.length * manifests.length,
  });
}

/**
 * Appends additional deps to the list of install manifests returned by the
 * packing operation, if needed.
 *
 * Does not mutate `installManifests`.
 *
 * @param pkgManager PkgManager
 * @param add List of additional deps
 * @param installManifests Current `InstallManifest`s
 * @returns New `InstallManifest`s with additional deps appended (if any)
 */
export function appendAdditionalDeps(
  pkgManager: PkgManager,
  add: string[],
  installManifests: InstallManifest[],
) {
  if (!isEmpty(add)) {
    const allPkgSpecs = new Set(map(installManifests, 'pkgSpec'));
    const additionalDeps = add.filter((pkgSpec) => !allPkgSpecs.has(pkgSpec));
    return [
      ...installManifests,
      ...additionalDeps.map((pkgSpec) => ({
        cwd: pkgManager.tmpdir,
        pkgSpec,
        pkgName: pkgSpec,
        isAdditional: true,
      })),
    ];
  }
  return [...installManifests];
}

export function buildRunScriptManifests(
  scripts: string[],
  installManifests: InstallManifest[],
): RunScriptManifest[] {
  return installManifests
    .filter(({isAdditional, installPath}) => !isAdditional && installPath)
    .flatMap(({localPath, pkgName, installPath}) =>
      scripts.map(
        (script) =>
          ({
            script,
            localPath,
            pkgName,
            cwd: installPath,
          }) as RunScriptManifest,
      ),
    );
}
