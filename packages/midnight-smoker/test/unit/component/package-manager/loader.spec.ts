import {
  NULL_SPEC,
  NullPm,
  nullExecutor,
  nullPmDef,
} from '@midnight-smoker/test-util';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {UnsupportedPackageManagerError} from '../../../../src/component/package-manager/errors/unsupported-pkg-manager-error';
import type * as PMLoader from '../../../../src/component/package-manager/loader';
import {PkgManagerSpec} from '../../../../src/component/package-manager/pkg-manager-spec';
import {type PkgManagerDef} from '../../../../src/component/package-manager/pkg-manager-types';
import {InvalidArgError} from '../../../../src/error/common-error';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('loader', function () {
        let sandbox: sinon.SinonSandbox;
        let loadPackageManagers: typeof PMLoader.loadPackageManagers;
        let findPackageManagers: typeof PMLoader.findPackageManagers;

        beforeEach(function () {
          sandbox = createSandbox();

          ({loadPackageManagers, findPackageManagers} = rewiremock.proxy(() =>
            require('../../../../src/component/package-manager/loader'),
          ));
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('findPackageManagers()', function () {
          let pkgManagerDefs: PkgManagerDef[];
          let pkgManagerSpecs: Readonly<PkgManagerSpec>[];

          beforeEach(function () {
            pkgManagerDefs = [nullPmDef];
            pkgManagerSpecs = [NULL_SPEC];
          });

          describe('when pkgManagerDefs is empty', function () {
            it('should throw an InvalidArgError', async function () {
              expect(
                () => findPackageManagers([], pkgManagerSpecs),
                'to throw',
                new InvalidArgError(
                  'pkgManagerDefs must be a non-empty array',
                  {
                    argName: 'pkgManagerDefs',
                    position: 0,
                  },
                ),
              );
            });
          });

          describe('when provided no args', function () {
            it('should throw an InvalidArgError', async function () {
              expect(
                // @ts-expect-error - bad usage
                () => findPackageManagers(),
                'to throw',
                new InvalidArgError(
                  'pkgManagerDefs must be a non-empty array',
                  {
                    argName: 'pkgManagerDefs',
                    position: 0,
                  },
                ),
              );
            });
          });

          describe('when provided no specs', function () {
            it('should throw an InvalidArgError', async function () {
              expect(
                // @ts-expect-error - bad usage
                () => findPackageManagers([nullPmDef]),
                'to throw',
                new InvalidArgError(
                  'pkgManagerSpecs must be a non-empty array',
                  {
                    argName: 'pkgManagerSpecs',
                    position: 1,
                  },
                ),
              );
            });
          });

          describe('when all pkgManagerSpecs can be matched with a PkgManagerDef', function () {
            it('should return a Map of PkgManagerSpec to PkgManagerDef', async function () {
              const result = findPackageManagers(
                pkgManagerDefs,
                pkgManagerSpecs,
              );
              expect(result, 'to equal', new Map([[NULL_SPEC, nullPmDef]]));
            });
          });

          describe('when a pkgManagerSpec cannot be matched with a PkgManagerDef', function () {
            it('should throw an UnsupportedPackageManagerError', async function () {
              const unmatchedSpec = new PkgManagerSpec({
                pkgManager: 'pnpm',
              });
              expect(
                () =>
                  findPackageManagers(pkgManagerDefs, [
                    ...pkgManagerSpecs,
                    unmatchedSpec,
                  ]),
                'to throw',
                new UnsupportedPackageManagerError(
                  `No PackageManager component found that can handle "${unmatchedSpec}"`,
                  unmatchedSpec.pkgManager,
                  unmatchedSpec.version,
                ),
              );
            });
          });
        });

        describe('loadPackageManagers()', function () {
          describe('when provided an unknown package manager', function () {
            it('should reject', function () {
              expect(
                () =>
                  loadPackageManagers([nullPmDef], nullExecutor, nullExecutor, {
                    desiredPkgManagers: ['pnpm'],
                  }),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_UNSUPPORTEDPACKAGEMANAGER'},
              );
            });
          });

          describe('when provided no desired package managers', function () {
            beforeEach(function () {
              sandbox.stub(nullPmDef, 'accepts').returns(true);
              sandbox.replaceGetter(nullPmDef, 'bin', () => 'npm');
            });

            it('should guess a package manager', async function () {
              await expect(
                loadPackageManagers(
                  [nullPmDef],
                  nullExecutor,
                  nullExecutor,
                ).then((map) => [...map.values()]),
                'to be fulfilled with value satisfying',
                [expect.it('to be a', NullPm)],
              );
            });
          });

          describe('when provided a "system" desired pkg manager', function () {
            beforeEach(function () {
              sandbox.spy(nullPmDef, 'create');
            });
            it('should load the package manager', async function () {
              const systemNullExecutor = sandbox.stub() as typeof nullExecutor;
              const desiredSpec = PkgManagerSpec.create({
                pkgManager: 'nullpm',
                version: '1.0.0',
                isSystem: true,
              });
              await loadPackageManagers(
                [nullPmDef],
                nullExecutor,
                systemNullExecutor,
                {
                  desiredPkgManagers: [desiredSpec],
                },
              );
              expect(nullPmDef.create, 'to have a call satisfying', [
                desiredSpec.toJSON(), // non-plain-objects cannot be compared using "satisfying"
                expect.it('to be', systemNullExecutor),
                {},
                {},
              ]).and('was called once');
            });
          });

          describe('when provided a version within the accepted range', function () {
            it('should load the package manager', async function () {
              await expect(
                loadPackageManagers([nullPmDef], nullExecutor, nullExecutor, {
                  desiredPkgManagers: ['nullpm@1'],
                }).then((map) => [...map.values()]),
                'to be fulfilled with value satisfying',
                [expect.it('to be a', NullPm)],
              );
            });
          });

          describe('when provided a version outside of the accepted range', function () {
            beforeEach(function () {
              sandbox.stub(nullPmDef, 'accepts').returns(false);
            });

            it('should reject', async function () {
              await expect(
                loadPackageManagers([nullPmDef], nullExecutor, nullExecutor, {
                  desiredPkgManagers: ['nullpm@3'],
                }),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_UNSUPPORTEDPACKAGEMANAGER'},
              );
            });
          });
        });
      });
    });
  });
});
