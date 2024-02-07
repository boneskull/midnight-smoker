/**
 * Provides internal utilities for massaging event data.
 *
 * @packageDocumentation
 */

import type {PkgManagerInstallManifest} from '#schema/install-manifest.js';
import type {PkgManager} from '#schema/pkg-manager.js';
import type {RunScriptResult} from '#schema/run-script-result.js';
import {type RunScriptManifestWithPkgMgr} from '..';
import type {
  RunScriptsEndEventData,
  RunScriptsEventData,
} from '../component/schema/script-runner-events';

import type {InstallEventData} from './install-events';
import type {PackBeginEventData} from './pack-events';

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
    packageManagers: pkgManagers.map((pkgManager) => `${pkgManager.spec}`),
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
 * @param runScriptManifests - An array of package manager run manifests.
 * @returns The event data object containing the package manager run manifests
 *   and the total number of scripts.
 * @internal
 */
export function buildRunScriptsBeginEventData(
  runScriptManifests: RunScriptManifestWithPkgMgr[],
): RunScriptsEventData {
  const totalScripts = runScriptManifests.length;

  const pkgRunManifestForEmit: RunScriptsEventData['manifest'] =
    runScriptManifests.reduce<RunScriptsEventData['manifest']>(
      (acc, {pkgManager, ...manifest}) => {
        const spec = `${pkgManager.spec}`;
        if (spec in acc) {
          acc[spec].push(manifest);
        } else {
          acc[spec] = [manifest];
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
  const pkgManagerSpecPairs = pkgManagerSpecs.map(
    (spec) =>
      [spec.pkgManager, spec.version] as [name: string, version: string],
  );

  return {
    uniquePkgs,
    pkgManagerSpecs: pkgManagerSpecs.map((spec) => `${spec}`),
    pkgManagers: pkgManagerSpecPairs,
    additionalDeps,
    manifests: installManifests,
    total: pkgManagers.length * installManifests.length,
  };
}

export const buildPackOkEventData = buildInstallEventData;
