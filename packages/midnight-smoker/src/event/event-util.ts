/**
 * Provides internal utilities for massaging event data.
 *
 * @packageDocumentation
 */

import {type PkgManager, type SomePkgManager} from '#pkg-manager/pkg-manager';
import {type InstallEventBaseData} from '#schema/install-event';
import {type PackBeginEventData} from '#schema/pack-event';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import type {RunScriptResult} from '#schema/run-script-result';
import type {
  RunScriptsEndEventData,
  RunScriptsEventData,
} from '#schema/script-event';
import {filter, map, uniq} from 'lodash';

/**
 * Builds the event data for the `PackBegin` event.
 *
 * @param pkgManagers - An array of package managers.
 * @returns The event data object.
 * @internal
 */
export function buildPackBeginEventData(
  pkgManagers: SomePkgManager[],
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
  runScriptManifestsByPkgManager: Map<PkgManager, RunScriptManifest[]>,
): RunScriptsEventData {
  let total = 0;
  const manifest: RunScriptsEventData['manifest'] = Object.fromEntries(
    [...runScriptManifestsByPkgManager].map(([{spec}, runScriptManifests]) => {
      total += runScriptManifests.length;
      return [`${spec}`, runScriptManifests];
    }),
  );

  return {manifest: manifest, total: total};
}

/**
 * It's a fair amount of work to mash the data into a format more suitable for
 * display.
 *
 * @param pkgManagerInstallManifests What to install and with what package
 *   manager. Will include additional depsz
 * @returns Something to be emitted
 * @internal
 */
export function buildInstallEventData(
  pkgManagers: SomePkgManager[],
): InstallEventBaseData {
  const manifests = pkgManagers.flatMap(
    ({installManifests}) => installManifests,
  );
  const specs = pkgManagers.map(({spec}) => spec.toJSON());
  const additionalDeps = uniq(
    map(filter(manifests, {isAdditional: true}), 'pkgName'),
  );
  const uniquePkgs = uniq(manifests.flatMap(({pkgName}) => pkgName));

  return {
    uniquePkgs,
    pkgManagers: specs,
    additionalDeps,
    manifests,
    total: pkgManagers.length * manifests.length,
  };
}

export const buildPackOkEventData = buildInstallEventData;
