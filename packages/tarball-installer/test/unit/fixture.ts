import {OK} from 'midnight-smoker/constants';
import {type ExecOutput, type Executor} from 'midnight-smoker/defs/executor';
import {
  type PkgManager,
  type PkgManagerPackContext,
  type WorkspaceInstallManifest,
} from 'midnight-smoker/defs/pkg-manager';
import {
  PkgManagerSpec,
  type RunScriptResultOk,
} from 'midnight-smoker/pkg-manager';
import {PluginMetadata} from 'midnight-smoker/plugin';
import {scheduler} from 'node:timers/promises';

/**
 * Artificial delay for testing
 */
const DELAY = 100;

export const nullPkgManager: PkgManager = {
  bin: 'nullpm',
  async install() {
    await scheduler.wait(DELAY);
    const output: ExecOutput = {
      command: '',
      cwd: '',
      exitCode: 0,
      stderr: '',
      stdout: '',
    };
    return output;
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
    const rawResult: ExecOutput = {
      command: '',
      cwd: '',
      exitCode: 0,
      stderr: '',
      stdout: '',
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

export const nullExecutor: Executor = async (): Promise<ExecOutput> => {
  const result: ExecOutput = {
    command: '',
    cwd: '',
    exitCode: 0,
    stderr: '',
    stdout: '',
  };
  return result;
};

export const nullPkgManagerSpec = new PkgManagerSpec({
  name: 'nullpm',
  requestedAs: `nullpm@1.0.0`,
  version: '1.0.0',
});

export const testPlugin = PluginMetadata.createTransient('test-plugin');

export const workspaceInstallManifest: WorkspaceInstallManifest = {
  cwd: '/some/cwd',
  installPath: '/some/tmp/path',
  isAdditional: false,
  localPath: '/some/other/path',
  pkgJson: {name: 'test-package', version: '1.0.0'},
  pkgJsonPath: '/path/to/package.json',
  pkgJsonSource: "{name: 'test-package', version: '1.0.0'}",
  pkgName: 'test-package',
  pkgSpec: 'nullpm@1.0.0',
};

export const makePkgManagerPackContext = (
  spec: PkgManagerSpec = nullPkgManagerSpec,
  executor: Executor = nullExecutor,
  signal: AbortSignal = new AbortController().signal,
  timeout?: number,
): PkgManagerPackContext => {
  return {
    executor,
    localPath: '/path/to/package',
    pkgJson: {name: 'test-package', version: '1.0.0'},
    pkgJsonPath: '/path/to/package/package.json',
    pkgJsonSource: '{"name": "test-package", "version": "1.0.0"}',
    pkgName: 'test-package',
    signal,
    spec,
    timeout,
    tmpdir: '/tmp',
    workspaceInfo: [
      {
        localPath: '/path/to/package',
        pkgJson: {name: 'test-package', version: '1.0.0'},
        pkgJsonPath: '/path/to/package/package.json',
        pkgJsonSource: '{"name": "test-package", "version": "1.0.0"}',
        pkgName: 'test-package',
      },
    ],
  };
};
