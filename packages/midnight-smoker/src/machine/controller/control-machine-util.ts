import {uniquePkgNames} from '#machine/util';
import {type PkgManagerSpec} from '#pkg-manager';
import {type InstallManifest, type RunScriptManifest} from '#schema';
import {filter, map, uniq} from 'lodash';
import {type PkgManagerInitPayload} from '../reifier/reifier-machine';

export function buildInstallEventData(
  pkgManagerDefSpecs: PkgManagerInitPayload[],
  manifestMap: WeakMap<PkgManagerSpec, InstallManifest[]>,
) {
  const manifests = pkgManagerDefSpecs.flatMap(
    ({spec}) => manifestMap.get(spec) ?? [],
  );
  const additionalDeps = uniq(
    map(filter(manifests, {isAdditional: true}), 'pkgName'),
  );
  const uniquePkgs = uniquePkgNames(manifests);
  const specs = pkgManagerDefSpecs.map(({spec}) => spec.toJSON());

  return {
    uniquePkgs,
    pkgManagers: specs,
    additionalDeps,
    manifests,
    totalPkgs: pkgManagerDefSpecs.length * manifests.length,
  };
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
