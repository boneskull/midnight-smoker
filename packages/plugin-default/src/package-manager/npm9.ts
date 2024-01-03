import Debug from 'debug';
import type {
  Errors,
  Executor,
  Helpers,
  PkgManager,
} from 'midnight-smoker/plugin';
import type {SemVer} from 'semver';
import {Npm7} from './npm7';

/**
 * Type of item in the {@linkcode NpmPackItem.files} array.
 *
 * @internal
 */
export interface NpmPackItemFileEntry {
  mode: number;
  path: string;
  size: number;
}

/**
 * JSON output of `npm pack`
 *
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

export class Npm9 extends Npm7 implements PkgManager.PackageManager {
  public static readonly bin = 'npm';

  public readonly name = 'npm';

  constructor(
    id: string,
    executor: Executor.Executor,
    tempdir: string,
    opts: PkgManager.PackageManagerOpts = {},
  ) {
    super(id, executor, tempdir, opts);
    this.debug = Debug(`midnight-smoker:pm:npm9`);
  }

  public static accepts(semver: SemVer) {
    return Boolean(~semver.compare('9.0.0'));
  }

  public static async create(
    this: void,
    id: string,
    executor: Executor.Executor,
    helpers: typeof Helpers,
    opts?: PkgManager.PackageManagerOpts,
  ) {
    const tempdir = await helpers.createTempDir();
    return new Npm9(id, executor, tempdir, opts);
  }

  public override async install(
    installManifests: PkgManager.InstallManifest[],
  ): Promise<Executor.ExecResult> {
    if (!installManifests.length) {
      throw new TypeError('installManifests must be a non-empty array');
    }

    // otherwise we get a deprecation warning
    const installSpecs = installManifests.map(({spec}) => spec);
    let err: Errors.InstallError | undefined;
    const installArgs = [
      'install',
      '--no-audit',
      '--no-package-lock',
      '--install-strategy=shallow',
      '--json',
      ...installSpecs,
    ];

    let installResult: Executor.ExecResult;
    try {
      installResult = await this.executor(
        this.spec,
        installArgs,
        {},
        {cwd: this.tmpdir},
      );
      err = this.handleInstallError(installResult, installSpecs);
    } catch (e) {
      err = this.handleInstallError(e as Executor.ExecError, installSpecs);
    }
    if (err) {
      throw err;
    }
    this.debug('(install) Installed %d packages', installSpecs.length);
    return installResult!;
  }
}

export default Npm9 satisfies PkgManager.PackageManagerModule;
