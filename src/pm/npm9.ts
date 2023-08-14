import createDebug from 'debug';
import type {SemVer} from 'semver';
import {SmokerError} from '../error';
import type {InstallManifest} from '../types';
import type {CorepackExecutor} from './corepack';
import type {ExecError} from './executor';
import {Npm7} from './npm7';
import type {
  InstallResult,
  PackageManager,
  PackageManagerModule,
  PackageManagerOpts,
} from './pm';

/**
 * Type of item in the {@linkcode NpmPackItem.files} array.
 * @internal
 */
export interface NpmPackItemFileEntry {
  mode: number;
  path: string;
  size: number;
}

/**
 * JSON output of `npm pack`
 * @internal
 */
export interface NpmPackItem {
  bundled: any[];
  entryCount: number;
  filename: string;
  files: NpmPackItemFileEntry[];
  id: string;
  integrity: string;
  name: string;
  shasum: string;
  size: number;
  unpackedSize: number;
  version: string;
}

export class Npm9 extends Npm7 implements PackageManager {
  public static readonly bin = 'npm';

  public readonly name = 'npm';

  constructor(executor: CorepackExecutor, opts?: PackageManagerOpts) {
    super(executor, opts);
    this.debug = createDebug(`midnight-smoker:pm:npm9`);
  }

  public static accepts(semver: SemVer) {
    return Boolean(~semver.compare('9.0.0'));
  }

  public static load(executor: CorepackExecutor, opts?: PackageManagerOpts) {
    return new Npm7(executor, opts);
  }

  public async install(manifest: InstallManifest): Promise<InstallResult> {
    const {packedPkgs, tarballRootDir} = manifest;
    if (!packedPkgs?.length) {
      throw new TypeError('(install) Non-empty "packedPkgs" arg is required');
    }

    const additionalDeps = manifest.additionalDeps ?? [];

    // otherwise we get a deprecation warning
    const installArgs = [
      'install',
      '--no-package-lock',
      '--install-strategy=shallow',
      ...packedPkgs.map(({tarballFilepath}) => tarballFilepath),
      ...additionalDeps,
    ];

    let installResult: InstallResult;
    try {
      installResult = await this.executor.exec(installArgs, {
        cwd: tarballRootDir,
      });
    } catch (err) {
      throw new SmokerError(
        `(install) ${this.name} failed to spawn: ${(err as ExecError).message}`,
      );
    }
    if (installResult.exitCode) {
      this.debug('(install) Failed: %O', installResult);
      throw new SmokerError(
        `(install) Installation failed with exit code ${installResult.exitCode}: ${installResult.stderr}`,
      );
    }

    this.debug('(install) Installed %d packages', packedPkgs.length);

    return installResult;
  }
}

export default Npm9 satisfies PackageManagerModule;
