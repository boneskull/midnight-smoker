import {DEFAULT_PKG_MANAGER_BIN, DEFAULT_PKG_MANAGER_VERSION} from '#constants';
import type * as PMO from '#pkg-manager/pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {FileManager} from '#util/filemanager';
import {type Volume} from 'memfs/lib/volume';
import path from 'node:path';
import util from 'node:util';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {nullPkgManagerDef} from '../../mocks';
import {createFsMocks} from '../../mocks/fs';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('PackageManagerOracle', function () {
        const SYSTEM_PKG_MANAGER_VERSION = '1.0.1';

        let sandbox: sinon.SinonSandbox;
        let fs: Volume;
        let fileManager: FileManager;
        let execFileStub: sinon.SinonStub<any[], Promise<{stdout: string}>>;
        let PkgManagerOracle: typeof PMO.PkgManagerOracle;
        let getSystemPkgManagerVersionStub: sinon.SinonStub<
          [string],
          Promise<string>
        >;
        beforeEach(function () {
          sandbox = createSandbox();
          // let mocks: FsMocks;
          ({vol: fs} = createFsMocks());
          execFileStub = sandbox.stub().resolves({stdout: '1.0.0\n'});

          fileManager = FileManager.create({fs: fs as any});
          getSystemPkgManagerVersionStub = sandbox
            .stub<[string], Promise<string>>()
            .resolves(SYSTEM_PKG_MANAGER_VERSION);

          ({PkgManagerOracle} = rewiremock.proxy(
            () => require('#pkg-manager/pkg-manager-spec'),
            {
              'node:child_process': {
                execFile: Object.assign(sandbox.stub(), {
                  [util.promisify.custom]: execFileStub,
                }),
              },
            },
          ));
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('method', function () {
          let workspaceInfo: WorkspaceInfo[];
          beforeEach(function () {
            workspaceInfo = [
              {
                pkgName: 'example-package',
                localPath: '/path/to/package',
                pkgJson: {},
                pkgJsonPath: '/path/to/package/package.json',
              } as WorkspaceInfo,
            ];
          });
          let oracle: PMO.PkgManagerOracle;

          beforeEach(function () {
            oracle = new PkgManagerOracle([nullPkgManagerDef], {
              workspaceInfo,
              fileManager,
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
                  oracle.guessPackageManager(),
                  'to be fulfilled with value satisfying',
                  {
                    bin: 'nullpm',
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
                  path.normalize(`/${nullPkgManagerDef.lockfile}`),
                  '',
                );
              });

              it('should pick the package manager based on the lockfile', async function () {
                await expect(
                  oracle.guessPackageManager(),
                  'to be fulfilled with value satisfying',
                  {
                    bin: nullPkgManagerDef.bin,
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

              it('should resolve with the default system pkg manager', async function () {
                await expect(
                  oracle.guessPackageManager(),
                  'to be fulfilled with value satisfying',
                  {
                    bin: DEFAULT_PKG_MANAGER_BIN,
                    version: expect.it('to be a string'),
                    isSystem: true,
                  },
                );
              });
            });
          });
        });

        describe('static method', function () {
          describe('defaultGetSystemPkgManagerVersion()', function () {
            beforeEach(function () {
              PkgManagerOracle.defaultGetSystemPkgManagerVersion.cache =
                new Map();
            });

            it('should return the version when execFile succeeds', async function () {
              const expectedVersion = '1.0.0';
              execFileStub.resolves({
                stdout: `${expectedVersion}\n`,
              });

              const version =
                await PkgManagerOracle.defaultGetSystemPkgManagerVersion('npm');
              await expect(version, 'to be', expectedVersion);
            });

            it('should return the default version when execFile fails', async function () {
              execFileStub.rejects(new Error('Failed to execute'));

              const version =
                await PkgManagerOracle.defaultGetSystemPkgManagerVersion('npm');
              await expect(version, 'to be', DEFAULT_PKG_MANAGER_VERSION);
            });

            it('should call execFile with the correct arguments', async function () {
              await PkgManagerOracle.defaultGetSystemPkgManagerVersion('npm');
              expect(execFileStub, 'to have a call satisfying', [
                'npm',
                ['--version'],
              ]);
            });
          });
        });
      });
    });
  });
});
