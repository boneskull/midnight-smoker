/**
 * Provides a "null" {@link NullPkgManagerController PkgManagerController} which
 * can be provided as in `SmokerCapabilities` to ensure no packing,
 * installation, or custom scripts get run.
 *
 * @packageDocumentation
 */

import {type PkgManagerInstallManifest} from 'midnight-smoker';
import {
  PkgManagerController,
  type PkgManagerControllerRunScriptsOpts,
} from 'midnight-smoker/controller';
import {
  type InstallResult,
  type PkgManager,
  type RunScriptResult,
} from 'midnight-smoker/pkg-manager';

/* eslint-disable @typescript-eslint/no-unused-vars */

export class NullPkgManagerController extends PkgManagerController {
  /**
   * Returns no package managers.
   *
   * @returns Empty array
   */
  public async getPkgManagers(): Promise<readonly PkgManager[]> {
    return [];
  }

  /**
   * Installs nothing
   *
   * @param installManifests: Install manifests
   * @returns Empty array
   */
  public async install(
    installManifests: PkgManagerInstallManifest[],
  ): Promise<InstallResult[]> {
    return [];
  }

  /**
   * Packs nothing
   *
   * @returns Empty array
   */
  public async pack(): Promise<PkgManagerInstallManifest[]> {
    return [];
  }

  /**
   * Runs no custom scripts
   *
   * @param scripts - Scripts to (not) run
   * @param installResults - Results of (not) installing
   * @param opts - Options (unused)
   * @returns Empty array
   */
  public async runScripts(
    scripts: string[],
    installResults: InstallResult[],
    opts: PkgManagerControllerRunScriptsOpts,
  ): Promise<RunScriptResult[]> {
    return [];
  }
}
