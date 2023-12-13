/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  InstallResult,
  PackageManager,
  PkgManagerInstallManifest,
  RunScriptResult,
} from '../../../src/component';
import {
  PkgManagerController,
  RunScriptsOpts,
} from '../../../src/component/package-manager/controller';

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
