import {type Volume} from 'memfs/lib/volume';
import path from 'node:path';
import {scheduler} from 'node:timers/promises';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {PkgManagerOracle} from '../../../../src/component/pkg-manager/pkg-manager-spec';
import {type PkgManagerDef} from '../../../../src/component/schema/pkg-manager-def';
import {
  DEFAULT_PKG_MANAGER_BIN,
  DEFAULT_PKG_MANAGER_VERSION,
} from '../../../../src/constants';
import {createFsMocks} from '../../mocks/fs';
const expect = unexpected.clone().use(unexpectedSinon);
const TEST_TMPDIR = '/tmp';

export const nullPmDef: PkgManagerDef = {
  bin: 'nullpm',
  accepts(value: string) {
    return value;
  },
  lockfile: 'nullpm.lock',
  async install() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          stdout: '',
          stderr: '',
          command: 'something',
          exitCode: 0,
          failed: false,
        });
      }, 500);
    });
  },
  async pack() {
    await scheduler.wait(1500);
    return {
      pkgSpec: `${TEST_TMPDIR}/bar.tgz`,
      pkgName: 'bar',
      cwd: TEST_TMPDIR,
      installPath: `${TEST_TMPDIR}/node_modules/bar`,
    };
  },
  async runScript() {
    await scheduler.wait(1500);
    return {
      rawResult: {
        stdout: '',
        stderr: '',
        command: '',
        exitCode: 0,
        failed: false,
      },
      skipped: false,
    };
  },
};
describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('PackageManagerOracle', function () {
        const SYSTEM_PKG_MANAGER_VERSION = '1.0.1';

        let sandbox: sinon.SinonSandbox;
        let fs: Volume;

        let getSystemPkgManagerVersionStub: sinon.SinonStub<
          [string],
          Promise<string>
        >;
        // let fileManager: FileManager;
        beforeEach(function () {
          sandbox = createSandbox();
          // let mocks: FsMocks;
          ({vol: fs} = createFsMocks());

          getSystemPkgManagerVersionStub = sandbox
            .stub<[string], Promise<string>>()
            .resolves(SYSTEM_PKG_MANAGER_VERSION);
        });

        afterEach(function () {
          sandbox.restore();
        });
        describe('method', function () {
          let oracle: PkgManagerOracle;
          beforeEach(function () {
            oracle = new PkgManagerOracle({
              fileManagerOpts: {fs: fs as any},
              cwd: '/',
              getSystemPkgManagerVersion: getSystemPkgManagerVersionStub,
            });
          });

          describe('guessPackageManager()', function () {
            describe('when the nearest package.json contains a packageManager field', function () {
              beforeEach(async function () {
                await fs.promises.writeFile(
                  path.normalize('/package.json'),
                  JSON.stringify({packageManager: 'nullpm@1.0.0'}),
                );
              });

              it('should pick the package manager from the packageManager field', async function () {
                await expect(
                  oracle.guessPackageManager([]),
                  'to be fulfilled with value satisfying',
                  {
                    pkgManager: 'nullpm',
                    version: '1.0.0',
                    isSystem: false,
                  },
                );
              });
            });

            describe('when the cwd contains a package-manager-specific lockfile', function () {
              beforeEach(async function () {
                await fs.promises.writeFile(
                  path.normalize('/package.json'),
                  JSON.stringify({}),
                );
                await fs.promises.writeFile(
                  path.normalize(`/${nullPmDef.lockfile}`),
                  '',
                );
              });

              it('should pick the package manager based on the lockfile', async function () {
                await expect(
                  oracle.guessPackageManager([nullPmDef]),
                  'to be fulfilled with value satisfying',
                  {
                    pkgManager: nullPmDef.bin,
                    version: SYSTEM_PKG_MANAGER_VERSION,
                    isSystem: true,
                  },
                );
              });
            });

            describe('when no lockfile nor packageManager field is found', function () {
              beforeEach(async function () {
                await fs.promises.writeFile(
                  path.normalize('/package.json'),
                  JSON.stringify({}),
                );
              });

              it('should resolve with the default package manager', async function () {
                await expect(
                  oracle.guessPackageManager([]),
                  'to be fulfilled with value satisfying',
                  {
                    pkgManager: DEFAULT_PKG_MANAGER_BIN,
                    version: DEFAULT_PKG_MANAGER_VERSION,
                    isSystem: false,
                  },
                );
              });
            });
          });
        });
      });
    });
  });
});
