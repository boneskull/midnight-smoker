/* eslint-disable @typescript-eslint/no-unused-vars */
import type {PkgManager} from 'midnight-smoker/plugin';
import type {SemVer} from 'semver';
import {MOCK_TMPDIR} from './constants';
import {nullExecutor} from './null-executor';
export const NULL_SPEC = 'nullpm@1.0.0';

export const nullPmModule: PkgManager.PkgManagerDef = {
  bin: 'nullpm',
  async create(id, executor, helpers, opts) {
    return new NullPm(id, executor, opts);
  },
  accepts(semver: SemVer): boolean {
    return true;
  },
};

export class NullPm implements PkgManager.PkgManager {
  constructor(
    public readonly spec: string,
    public executor: PkgManager.Executor = nullExecutor,
    public opts: PkgManager.PkgManagerOpts = {},
  ) {}

  async install(
    installManifests: PkgManager.InstallManifest[],
  ): Promise<PkgManager.ExecResult> {
    return {
      stdout: '',
      stderr: '',
      command: 'something',
      exitCode: 0,
      failed: false,
    };
  }

  async pack(opts: PkgManager.PackOptions) {
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
    runManifest: PkgManager.RunScriptManifest,
    opts: PkgManager.PkgManagerRunScriptOpts,
  ): Promise<PkgManager.RunScriptResult> {
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
