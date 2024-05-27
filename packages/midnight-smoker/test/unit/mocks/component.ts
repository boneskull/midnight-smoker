import {SKIPPED} from '../../../src/constants';
import {type ExecResult} from '../../../src/executor';
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
  async pack() {
    const result: InstallManifest = {
      cwd: '',
      pkgName: '',
      pkgSpec: '',
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
