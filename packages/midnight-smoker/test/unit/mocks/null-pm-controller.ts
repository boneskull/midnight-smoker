/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  InstallResult,
  PackageManager,
  PkgManagerInstallManifest,
  RunScriptResult,
} from '../../../src/component';
import type {RunScriptsOpts} from '../../../src/component/package-manager/controller';
import {PkgManagerController} from '../../../src/component/package-manager/controller';

export class NullPkgManagerController extends PkgManagerController {
  async getPkgManagers(): Promise<readonly PackageManager[]> {
    return [];
  }

  async install(
    installManifests: PkgManagerInstallManifest[],
  ): Promise<InstallResult[]> {
    return [];
  }

  async pack(): Promise<PkgManagerInstallManifest[]> {
    return [];
  }

  async runScripts(
    scripts: string[],
    installResults: InstallResult[],
    opts: RunScriptsOpts,
  ): Promise<RunScriptResult[]> {
    return [];
  }
}
