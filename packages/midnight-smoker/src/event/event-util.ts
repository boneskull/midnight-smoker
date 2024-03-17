/**
 * Provides internal utilities for massaging event data.
 *
 * @packageDocumentation
 */

import {type PkgManager} from '#pkg-manager/pkg-manager';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import type {RunScriptResult} from '#schema/run-script-result';
import type {
  RunScriptsEndEventData,
  RunScriptsEventData,
} from '#schema/script-event';

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
  const failed = results.filter((result) => 'error' in result).length;
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

  return {manifest, total};
}
