import {OK} from '#constants';
import {type ExecResult, type Executor} from '#executor';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type InstallManifest} from '#schema/install-manifest';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type ReporterDef} from '#schema/reporter-def';
import {type RuleDef} from '#schema/rule-def';
import {type RunScriptResult} from '#schema/run-script-result';
import path from 'node:path';

export const nullPkgManagerDef: PkgManagerDef = {
  name: 'null',
  bin: 'nullpm',
  description: 'test package manager',
  accepts() {
    return '1.0.0';
  },
  lockfile: 'nullpm.lock',
  async setup() {},
  async teardown() {},
  async install() {
    const result: ExecResult = {
      stdout: '',
      stderr: '',
      command: '',
      exitCode: 0,
      failed: false,
    };
    return result;
  },
  async pack(ctx) {
    const result: InstallManifest = {
      cwd: ctx.tmpdir,
      pkgName: ctx.pkgName,
      pkgSpec: `${ctx.pkgName}@1.0.0`,
      localPath: ctx.localPath,
      installPath: path.join(ctx.tmpdir, 'node_modules', 'foo'),
      isAdditional: false,
    };
    return result;
  },
  async runScript({manifest}) {
    const result: RunScriptResult = {
      type: OK,
      rawResult: {
        stdout: '',
        stderr: '',
        command: '',
        exitCode: 0,
        failed: false,
      },
      manifest,
    };
    return result;
  },
};

export const nullReporter: ReporterDef = {
  name: 'test-reporter',
  description: 'test reporter',
  async setup() {},
  async teardown() {},
};

export const nullRule: RuleDef = {
  name: 'test-rule',
  description: 'test rule',
  check: async () => {},
};

export const nullExecutor: Executor = async (): Promise<ExecResult> => {
  const result: ExecResult = {
    stdout: '',
    stderr: '',
    command: '',
    exitCode: 0,
    failed: false,
  };
  return result;
};

export const nullPkgManagerSpec = new PkgManagerSpec({
  bin: nullPkgManagerDef.bin,
  version: '1.0.0',
  isSystem: false,
});
