/**
 * Provides internal utilities for massaging event data.
 *
 * @packageDocumentation
 */

import {type InstallEventBaseData} from '#schema/install-event';
import type {PkgManagerInstallManifest} from '#schema/install-manifest';
import {type PackBeginEventData} from '#schema/pack-event';
import type {PkgManager} from '#schema/pkg-manager';
import type {RunScriptResult} from '#schema/run-script-result';
import type {
  RunScriptsEndEventData,
  RunScriptsEventData,
} from '#schema/script-runner-event';
import {type RunScriptManifestWithPkgMgr} from '..';

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
    // XXX fix
    uniquePkgs: [],
    pkgManagers: pkgManagers.map((pkgManager) => pkgManager.spec.toJSON()),
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
): InstallEventBaseData {
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

  return {
    uniquePkgs,
    pkgManagers: pkgManagerSpecs.map((spec) => spec.toJSON()),
    additionalDeps,
    manifests: installManifests,
    total: pkgManagers.length * installManifests.length,
  };
}

export const buildPackOkEventData = buildInstallEventData;
