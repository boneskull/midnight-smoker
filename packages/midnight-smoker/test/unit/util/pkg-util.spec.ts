import {type IFs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import type {execFile} from 'node:child_process';
import path from 'node:path';
import util from 'node:util';
import type readPkgUp from 'read-pkg-up';
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {DEFAULT_PKG_MANAGER_VERSION} from '../../../src/constants';
import type * as PkgUtil from '../../../src/util/pkg-util';
import {createFsMocks, type FsMocks} from '../mocks/fs';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    let Util: typeof PkgUtil;
    let sandbox: sinon.SinonSandbox;

    let fs: IFs;
    let vol: Volume;
    let pickPackageVersion: typeof PkgUtil.pickPackageVersion;
    let getSystemPkgManagerVersion: typeof PkgUtil.getSystemPkgManagerVersion;
    let ChildProcess: {
      execFile: sinon.SinonStubbedMember<typeof execFile> & {
        [util.promisify.custom]: sinon.SinonStub<
          any[],
          Promise<{stdout: string}>
        >;
      };
    };
    let execFileStub: sinon.SinonStub<any[], Promise<{stdout: string}>>;
    let readPackageJson: typeof PkgUtil.readPackageJson;

    const CWD = '/somewhere';

    beforeEach(function () {
      let mocks: FsMocks;
      ({vol, fs, mocks} = createFsMocks());
      sandbox = sinon.createSandbox();

      // so, yeah, we don't use execFile, we use the promisified execFile,
      // which is actually a property on the real execFile function.
      // I do not know if this is a public API.
      execFileStub = sandbox.stub().resolves({stdout: '1.0.0\n'});
      ChildProcess = {
        execFile: Object.assign(sandbox.stub(), {
          [util.promisify.custom]: execFileStub,
        }),
      } as typeof ChildProcess;

      vol.fromJSON(
        {
          './package.json': JSON.stringify({
            name: 'some-pkg',
            version: '1.0.0',
          }),
        },
        CWD,
      );

      Util = rewiremock.proxy(() => require('../../../src/util/pkg-util'), {
        ...mocks,
        'node:child_process': ChildProcess,

        // unfortunately, it's exceedingly difficult to _not_ load this module prior to running this test
        // without compartments or DI or something.
        // this forces it to load from the mock filesystem.
        'read-pkg-up': sandbox
          .stub()
          .callsFake(async ({cwd = CWD}: readPkgUp.Options) => {
            const filepath = path.join(cwd, 'package.json');
            return {
              packageJson: JSON.parse(
                (await fs.promises.readFile(filepath, 'utf8')) as string,
              ),
              path: filepath,
            };
          }),
      });

      ({readPackageJson, pickPackageVersion, getSystemPkgManagerVersion} =
        Util);
      readPackageJson.resetCache();
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('pkg-util', function () {
      describe('pickPackageVersion()', function () {
        describe('when provided a package name and spec', function () {
          it('should return the package name and spec', async function () {
            await expect(
              pickPackageVersion('foo@1.0.0', CWD),
              'to be fulfilled with',
              'foo@1.0.0',
            );
          });
        });

        describe('when provided a url to a git repo', function () {
          it('should return the url', async function () {
            await expect(
              pickPackageVersion(
                'https://github.com/boneskull/midnight-smoker.git',
                CWD,
              ),
              'to be fulfilled with',
              'https://github.com/boneskull/midnight-smoker.git',
            );
          });
        });

        describe('when provided a package name w/o a spec', function () {
          describe('when the package does not appear in the local package.json', function () {
            it('should return the package name and "latest" tag', async function () {
              await expect(
                pickPackageVersion('foo', CWD),
                'to be fulfilled with',
                'foo@latest',
              );
            });
          });

          describe('when the package appears in the local package.json in the "devDependencies" and "peerDependencies" fields', function () {
            beforeEach(async function () {
              vol.fromJSON(
                {
                  './package.json': JSON.stringify({
                    name: 'some-pkg',
                    version: '1.0.0',
                    devDependencies: {
                      mocha: '10.2.0',
                    },
                    peerDependencies: {mocha: '^10.0.0'},
                  }),
                },
                CWD,
              );
            });

            it('should return the package and spec from the "devDependencies" field', async function () {
              await expect(
                pickPackageVersion('mocha', CWD),
                'to be fulfilled with',
                'mocha@10.2.0',
              );
            });
          });

          describe('when the package appears in the local package.json in the "dependencies" and "peerDependencies" fields', function () {
            beforeEach(async function () {
              vol.fromJSON(
                {
                  './package.json': JSON.stringify({
                    name: 'some-pkg',
                    version: '1.0.0',
                    dependencies: {
                      mocha: '10.0.0',
                    },
                    peerDependencies: {mocha: '^10.0.0'},
                  }),
                },
                CWD,
              );
            });

            it('should return the package and spec from the "dependencies" field', async function () {
              await expect(
                pickPackageVersion('mocha', CWD),
                'to be fulfilled with',
                'mocha@10.0.0',
              );
            });
          });

          describe('when the package appears in the local package.json in the "optionalDependencies" and "peerDependencies" fields', function () {
            beforeEach(function () {
              vol.fromJSON(
                {
                  './package.json': JSON.stringify({
                    name: 'some-pkg',
                    version: '1.0.0',
                    optionalDependencies: {
                      mocha: '10.1.0',
                    },
                    peerDependencies: {mocha: '^10.0.0'},
                  }),
                },
                CWD,
              );
            });

            it('should return the package and spec from the "optionalDependencies" field', async function () {
              await expect(
                pickPackageVersion('mocha', CWD),
                'to be fulfilled with',
                'mocha@10.1.0',
              );
            });
          });

          describe('when the package appears in the local package.json in the "peerDependencies" field only', function () {
            beforeEach(function () {
              vol.fromJSON(
                {
                  './package.json': JSON.stringify({
                    name: 'some-pkg',
                    version: '1.0.0',
                    peerDependencies: {mocha: '^10.0.0'},
                  }),
                },
                CWD,
              );
            });

            it('should return the package and spec from the "peerDependencies" field', async function () {
              await expect(
                pickPackageVersion('mocha', CWD),
                'to be fulfilled with',
                'mocha@^10.0.0',
              );
            });
          });
        });
      });

      describe('getSystemPkgManagerVersion()', function () {
        beforeEach(function () {
          getSystemPkgManagerVersion.cache = new Map();
        });

        it('should return the version when execFile succeeds', async function () {
          const expectedVersion = '1.0.0';
          execFileStub.resolves({
            stdout: `${expectedVersion}\n`,
          });

          const version = await getSystemPkgManagerVersion('npm');
          await expect(version, 'to be', expectedVersion);
        });

        it('should return the default version when execFile fails', async function () {
          execFileStub.rejects(new Error('Failed to execute'));

          const version = await getSystemPkgManagerVersion('npm');
          await expect(version, 'to be', DEFAULT_PKG_MANAGER_VERSION);
        });

        it('should call execFile with the correct arguments', async function () {
          await getSystemPkgManagerVersion('npm');
          expect(execFileStub, 'to have a call satisfying', [
            'npm',
            ['--version'],
          ]);
        });
      });
    });
  });
});
