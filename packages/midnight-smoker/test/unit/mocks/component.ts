import {OK} from '#constants';
import {type ExecResult, type Executor} from '#executor';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PkgManager} from '#schema/pkg-manager';
import {type Reporter} from '#schema/reporter';
import {type Rule} from '#schema/rule';
import {type RunScriptResultOk} from '#schema/run-script-result';
import {scheduler} from 'node:timers/promises';

/**
 * Artificial delay for testing
 */
const DELAY = 100;

export const nullPkgManager: PkgManager = {
  bin: 'nullpm',
  async install() {
    await scheduler.wait(DELAY);
    const result: ExecResult = {
      command: '',
      escapedCommand: '',
      exitCode: 0,
      failed: false,
      isCanceled: false,
      killed: false,
      stderr: '',
      stdout: '',
      timedOut: false,
    };
    return result;
  },
  lockfile: 'nullpm.lock',
  name: 'nullpm',
  async pack({pkgJson, pkgName, tmpdir}) {
    await scheduler.wait(DELAY);
    return {
      cwd: tmpdir,
      installPath: `${tmpdir}/node_modules/${pkgName}`,
      pkgName,
      pkgSpec: `${tmpdir}/${pkgName}-${pkgJson.version}.tgz`,
    };
  },
  async runScript({manifest}) {
    await scheduler.wait(DELAY);
    const rawResult: ExecResult = {
      command: '',
      escapedCommand: '',
      exitCode: 0,
      failed: false,
      isCanceled: false,
      killed: false,
      stderr: '',
      stdout: '',
      timedOut: false,
    };
    const result: RunScriptResultOk = {
      manifest,
      rawResult,
      type: OK,
    };
    return result;
  },
  async setup() {},
  supportedVersionRange: '^1.0.0',
  async teardown() {},
  versions: {
    tags: {latest: '1.0.0'},
    versions: ['1.0.0'],
  },
};

export const nullReporter: Reporter = {
  description: 'test reporter',
  name: 'test-reporter',
  async setup() {},
  async teardown() {},
};

export const nullRule: Rule = {
  check: async () => {},
  description: 'test rule',
  name: 'test-rule',
};

export const nullExecutor: Executor = async (): Promise<ExecResult> => {
  const result: ExecResult = {
    command: '',
    escapedCommand: '',
    exitCode: 0,
    failed: false,
    isCanceled: false,
    killed: false,
    stderr: '',
    stdout: '',
    timedOut: false,
  };
  return result;
};

export const nullPkgManagerSpec = new PkgManagerSpec({
  name: nullPkgManager.name,
  requestedAs: `${nullPkgManager.name}@1.0.0`,
  version: '1.0.0',
});

export const systemNullPkgManagerSpec = new PkgManagerSpec({
  bin: `/usr/bin/${nullPkgManager.bin}`,
  name: nullPkgManager.name,
  requestedAs: `${nullPkgManager.name}@1.0.0`,
  version: '1.0.0',
});
