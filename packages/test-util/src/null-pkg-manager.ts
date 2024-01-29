/* eslint-disable import/no-duplicates */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {type ExecResult, type Executor} from 'midnight-smoker/executor';
import {
  PkgManagerSpec,
  type InstallManifest,
  type PackOptions,
  type PkgManager,
  type PkgManagerDef,
  type PkgManagerOpts,
  type PkgManagerRunScriptOpts,
  type RunScriptManifest,
  type RunScriptResult,
} from 'midnight-smoker/pkg-manager';
import type {SemVer} from 'semver';
import {MOCK_TMPDIR} from './constants';

export const nullPmDef: PkgManagerDef = {
  get bin() {
    return 'nullpm';
  },
  async create(spec, executor, helpers, opts) {
    return new NullPm(spec, executor, opts);
  },
  accepts(semver: SemVer): boolean {
    return true;
  },
};

export class NullPm implements PkgManager {
  spec: Readonly<PkgManagerSpec>;
  constructor(
    spec?: PkgManagerSpec,
    public executor?: Executor,
    public opts: PkgManagerOpts = {},
  ) {
    this.spec =
      spec ??
      PkgManagerSpec.create({
        pkgManager: 'nullpm',
        version: '1.0.0',
      });
  }

  async install(installManifests: InstallManifest[]): Promise<ExecResult> {
    return {
      stdout: '',
      stderr: '',
      command: 'something',
      exitCode: 0,
      failed: false,
    };
  }

  async pack(opts: PackOptions) {
    return [
      {
        spec: `${MOCK_TMPDIR}/bar.tgz`,
        pkgName: 'bar',
        cwd: MOCK_TMPDIR,
      },
    ];
  }

  public readonly tmpdir = MOCK_TMPDIR;

  public readonly path = '/usr/bin/nullpm';

  public async getBinPath(): Promise<string> {
    return this.path;
  }

  public async getVersion(): Promise<string> {
    return '5.0.0';
  }

  public async runScript(
    runManifest: RunScriptManifest,
    opts: PkgManagerRunScriptOpts,
  ): Promise<RunScriptResult> {
    return {
      pkgName: runManifest.pkgName,
      script: runManifest.script,
      rawResult: {
        stdout: '',
        stderr: '',
        command: '',
        exitCode: 0,
        failed: false,
      },
      cwd: '/some/cwd',
    };
  }
}
