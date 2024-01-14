/**
 * Provides a "null" {@link NullPkgManagerController PkgManagerController} which
 * can be provided as in `SmokerCapabilities` to ensure no packing,
 * installation, or custom scripts get run.
 *
 * @packageDocumentation
 */

import {Controller, type PkgManager} from 'midnight-smoker/plugin';

/* eslint-disable @typescript-eslint/no-unused-vars */

export class NullPkgManagerController extends Controller.PkgManagerController {
  /**
   * Returns no package managers.
   *
   * @returns Empty array
   */
  public async getPkgManagers(): Promise<readonly PkgManager.PkgManager[]> {
    return [];
  }

  /**
   * Installs nothing
   *
   * @param installManifests: Install manifests
   * @returns Empty array
   */
  public async install(
    installManifests: PkgManager.PkgManagerInstallManifest[],
  ): Promise<PkgManager.InstallResult[]> {
    return [];
  }

  /**
   * Packs nothing
   *
   * @returns Empty array
   */
  public async pack(): Promise<PkgManager.PkgManagerInstallManifest[]> {
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
    installResults: PkgManager.InstallResult[],
    opts: Controller.PkgManagerControllerRunScriptsOpts,
  ): Promise<PkgManager.RunScriptResult[]> {
    return [];
  }
}
