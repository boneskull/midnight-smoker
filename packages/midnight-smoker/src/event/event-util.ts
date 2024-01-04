/**
 * Provides internal utilities for massaging event data.
 *
 * @packageDocumentation
 */

import type {
  PkgManager,
  PkgManagerInstallManifest,
  PkgManagerRunScriptManifest,
  RunScriptResult,
} from '../component/schema/pkg-manager-schema';
import type {InstallEventData} from './install-events';
import type {PackBeginEventData} from './pack-events';
import type {
  RunScriptsEndEventData,
  RunScriptsEventData,
} from './script-runner-events';

/**
 * Builds the event data for the `PackBegin` event.
 *
 * @param pkgManagers - An array of package managers.
 * @returns The event data object.
 * @internal
 */
export function buildPackBeginEventData(
  pkgManagers: readonly PkgManager[],
): PackBeginEventData {
  return {
    packageManagers: pkgManagers.map((pkgManager) => pkgManager.spec),
  };
}

/**
 * Builds the event data for the `RunScriptsEnd` event.
 *
 * @param beginEventData - The event data from the `RunScriptsBegin` event.
 * @param results - The results of running the scripts.
 * @returns The event data for the `RunScriptsEnd` event.
 */
export function buildRunScriptsEndEventData(
  beginEventData: RunScriptsEventData,
  results: RunScriptResult[],
): RunScriptsEndEventData {
  const failed = results.filter((result) => result.error).length;
  const passed = results.length - failed;

  return {...beginEventData, results, failed, passed};
}

/**
 * Builds the event data for the `RunScriptsBegin` event.
 *
 * @param controllerRunManifests - An array of package manager run manifests.
 * @returns The event data object containing the package manager run manifests
 *   and the total number of scripts.
 * @internal
 */
export function buildRunScriptsBeginEventData(
  controllerRunManifests: PkgManagerRunScriptManifest[],
): RunScriptsEventData {
  const totalScripts = controllerRunManifests.length;

  const pkgRunManifestForEmit: RunScriptsEventData['manifest'] =
    controllerRunManifests.reduce<RunScriptsEventData['manifest']>(
      (acc, manifest) => {
        if (manifest.pkgManager.spec in acc) {
          acc[manifest.pkgManager.spec].push(manifest);
        } else {
          acc[manifest.pkgManager.spec] = [manifest];
        }
        return acc;
      },
      {},
    );

  return {manifest: pkgRunManifestForEmit, total: totalScripts};
}

/**
 * It's a fair amount of work to mash the data into a format more suitable for
 * display.
 *
 * This is used by the events {@link SmokerEvent.InstallBegin InstallBegin},
 * {@link SmokerEvent.InstallOk InstallOk}, and
 * {@link SmokerEvent.PackOk PackOk}.
 *
 * @param installManifests What to install and with what package manager. Will
 *   include additional depsz
 * @returns Something to be emitted
 * @internal
 */
export function buildInstallEventData(
  installManifests: PkgManagerInstallManifest[],
  pkgManagers: readonly PkgManager[],
): InstallEventData {
  // could use _.partition here!
  const uniquePkgs = [
    ...new Set(
      installManifests
        .filter(({isAdditional}) => !isAdditional)
        .map(({spec}) => spec),
    ),
  ];

  const additionalDeps = [
    ...new Set(
      installManifests
        .filter(({isAdditional}) => isAdditional)
        .map(({spec}) => spec),
    ),
  ];

  const pkgManagerSpecs = pkgManagers.map(({spec}) => spec);
  const pkgManagerSpecPairs = pkgManagerSpecs.map((spec) =>
    spec.split('@'),
  ) as [name: string, version: string][];

  return {
    uniquePkgs,
    pkgManagerSpecs,
    pkgManagers: pkgManagerSpecPairs,
    additionalDeps,
    manifests: installManifests,
    total: pkgManagers.length * installManifests.length,
  };
}

export const buildPackOkEventData = buildInstallEventData;
