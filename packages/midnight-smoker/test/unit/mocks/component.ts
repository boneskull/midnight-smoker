import path from 'node:path';
import {SKIPPED} from '../../../src/constants';
import {type ExecResult, type Executor} from '../../../src/executor';
import {
  type InstallManifest,
  type RunScriptResult,
} from '../../../src/pkg-manager';
import {type ReporterDef} from '../../../src/reporter';
import {type PkgManagerDef} from '../../../src/schema/pkg-manager-def';
import {type RuleDef} from '../../../src/schema/rule-def';

export const nullPkgManager: PkgManagerDef = {
  bin: 'test-pm',
  description: 'test package manager',
  accepts() {
    return '1.0.0';
  },
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
  async runScript() {
    const result: RunScriptResult = {type: SKIPPED};
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
