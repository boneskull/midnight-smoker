import Debug from 'debug';
import {type ExecResult, type Executor} from 'midnight-smoker/executor';
import {
  type InstallManifest,
  type PkgManager,
  type PkgManagerDef,
  type PkgManagerOpts,
  type PkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import type {PluginHelpers} from 'midnight-smoker/plugin';
import {Npm7} from './npm7';

export class Npm9 extends Npm7 implements PkgManager {
  public static readonly bin = 'npm';

  public static override accepts = '>=9.0.0';

  constructor(
    spec: PkgManagerSpec,
    executor: Executor,
    tempdir: string,
    opts: PkgManagerOpts = {},
  ) {
    super(spec, executor, tempdir, opts);
    this.debug = Debug(`midnight-smoker:pm:npm9`);
  }

  public static async create(
    this: void,
    spec: PkgManagerSpec,
    executor: Executor,
    helpers: PluginHelpers,
    opts?: PkgManagerOpts,
  ) {
    const tempdir = await helpers.createTempDir();
    return new Npm9(spec, executor, tempdir, opts);
  }

  public override async install(
    installManifests: InstallManifest[],
  ): Promise<ExecResult> {
    return this._install(installManifests, [
      '--no-audit',
      '--no-package-lock',
      '--install-strategy=shallow',
      '--json',
    ]);
  }
}

export default Npm9 satisfies PkgManagerDef;
