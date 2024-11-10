import {DEFAULT_PKG_MANAGER_NAME} from '#constants';
import {type PkgManager} from '#defs/pkg-manager';
import {
  getDesiredPkgManagerFromPackageJson,
  getPkgManagerFromLockfile,
} from '#pkg-manager/inspect';
import {FileManager} from '#util/filemanager';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

import {nullPkgManager} from '../mocks';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('pkg-manager', function () {
    describe('inspect', function () {
      let sandbox: sinon.SinonSandbox;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('getDesiredPkgManagerFromPackageJson()', function () {
        describe('when packageManager field is a string', function () {
          it('should return the packageManager field', function () {
            const workspaceInfo = {
              pkgJson: {
                packageManager: 'npm@7.20.0',
              },
            };
            const result = getDesiredPkgManagerFromPackageJson(
              workspaceInfo as any,
            );
            expect(result, 'to equal', 'npm@7.20.0');
          });
        });

        describe('when packageManager field is not present', function () {
          it('should return undefined', function () {
            const workspaceInfo = {
              pkgJson: {},
            };
            const result = getDesiredPkgManagerFromPackageJson(
              workspaceInfo as any,
            );
            expect(result, 'to be undefined');
          });
        });

        describe('when packageManager field is not a string', function () {
          it('should return undefined', function () {
            const workspaceInfo = {
              pkgJson: {
                packageManager: 123,
              },
            };
            const result = getDesiredPkgManagerFromPackageJson(
              workspaceInfo as any,
            );
            expect(result, 'to be undefined');
          });
        });
      });

      describe('getPkgManagerFromLockfile()', function () {
        let fileManager: FileManager;
        let globIterate: sinon.SinonStubbedMember<FileManager['globIterate']>;
        let pkgManagers: PkgManager[];

        beforeEach(function () {
          fileManager = new FileManager({fs: {} as any});
          globIterate = sandbox.stub(fileManager, 'globIterate');

          pkgManagers = [
            {...nullPkgManager, lockfile: 'yarn.lock', name: 'yarn'},
            {...nullPkgManager, lockfile: 'package-lock.json', name: 'npm'},
          ];
        });

        describe('when a matching lockfile is found', function () {
          it('should return the correct PkgManager', async function () {
            globIterate.returns(
              (async function* () {
                yield 'path/to/package-lock.json';
              })(),
            );

            await expect(
              getPkgManagerFromLockfile(
                pkgManagers,
                fileManager,
                '/path/to/workspace',
              ),
              'to be fulfilled with value satisfying',
              {lockfile: 'package-lock.json', name: 'npm'},
            );
          });
        });

        describe('when no matching lockfile is found', function () {
          it('should return undefined', async function () {
            globIterate.returns((async function* () {})());

            await expect(
              getPkgManagerFromLockfile(
                pkgManagers,
                fileManager,
                '/path/to/workspace',
              ),
              'to be fulfilled with value satisfying',
              undefined,
            );
          });
        });

        describe('when the signal is aborted', function () {
          it('should handle aborted signal', async function () {
            globIterate.returns(
              (async function* () {
                yield 'path/to/package-lock.json';
              })(),
            );

            await expect(
              getPkgManagerFromLockfile(
                pkgManagers,
                fileManager,
                '/path/to/workspace',
              ),
              'to be fulfilled with value satisfying',
              {lockfile: 'package-lock.json', name: 'npm'},
            );
          });
        });

        describe('when multiple matching lockfiles are found', function () {
          describe('when the default package manager lockfile is found', function () {
            it('should return the default package manager', async function () {
              globIterate.returns(
                (async function* () {
                  yield 'path/to/yarn.lock';
                  yield 'path/to/package-lock.json';
                })(),
              );

              await expect(
                getPkgManagerFromLockfile(
                  pkgManagers,
                  fileManager,
                  '/path/to/workspace',
                ),
                'to be fulfilled with value satisfying',
                {lockfile: 'package-lock.json', name: 'npm'},
              );
            });
          });

          describe('when the default package manager lockfile is not found', function () {
            it('should return a package manager', async function () {
              pkgManagers = [
                {...nullPkgManager, lockfile: 'yarn.lock', name: 'yarn'},
                {...nullPkgManager},
              ];

              globIterate.returns(
                (async function* () {
                  yield 'path/to/nullpm.lock';
                  yield 'path/to/yarn.lock';
                })(),
              );

              await expect(
                getPkgManagerFromLockfile(
                  pkgManagers,
                  fileManager,
                  '/path/to/workspace',
                ),
                'to be fulfilled with value satisfying',
                {
                  name: expect
                    .it('to be a string')
                    .and('not to match', new RegExp(DEFAULT_PKG_MANAGER_NAME)),
                },
              );
            });
          });
        });

        describe('when an unknown lockfile is found', function () {
          it('should throw an error', async function () {
            globIterate.returns(
              (async function* () {
                yield 'path/to/unknown.lock';
              })(),
            );

            await expect(
              getPkgManagerFromLockfile(
                pkgManagers,
                fileManager,
                '/path/to/workspace',
              ),
              'to be rejected with error satisfying',
              {
                message:
                  'No package manager found with lockfile: unknown.lock; this is a bug',
              },
            );
          });
        });
      });
    });
  });
});
