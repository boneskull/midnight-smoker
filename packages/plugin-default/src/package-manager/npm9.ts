import Debug from 'debug';
import {Executor, type Helpers, type PkgManager} from 'midnight-smoker/plugin';
import {Npm7} from './npm7';

export class Npm9 extends Npm7 implements PkgManager.PkgManager {
  public static readonly bin = 'npm';

  public static override accepts = '>=9.0.0';

  constructor(
    spec: PkgManager.PkgManagerSpec,
    executor: Executor.Executor,
    tempdir: string,
    opts: PkgManager.PkgManagerOpts = {},
  ) {
    super(spec, executor, tempdir, opts);
    this.debug = Debug(`midnight-smoker:pm:npm9`);
  }

  public static async create(
    this: void,
    spec: PkgManager.PkgManagerSpec,
    executor: Executor.Executor,
    helpers: typeof Helpers,
    opts?: PkgManager.PkgManagerOpts,
  ) {
    const tempdir = await helpers.createTempDir();
    return new Npm9(spec, executor, tempdir, opts);
  }

  public override async install(
    installManifests: PkgManager.InstallManifest[],
  ): Promise<Executor.ExecResult> {
    if (!installManifests.length) {
      throw new TypeError('installManifests must be a non-empty array');
    }

    // otherwise we get a deprecation warning
    const installSpecs = installManifests.map(({spec}) => spec);
    let err: PkgManager.Errors.InstallError | undefined;
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
      if (e instanceof Executor.ExecError) {
        err = this.handleInstallError(e, installSpecs);
      } else {
        throw e;
      }
    }
    if (err) {
      throw err;
    }
    this.debug('(install) Installed %d packages', installSpecs.length);
    return installResult!;
  }
}

export default Npm9 satisfies PkgManager.PkgManagerDef;
