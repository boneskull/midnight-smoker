import {ErrorCodes} from '#error';
import type * as PMLoader from '#pkg-manager/pkg-manager-loader';
import {nullPmDef} from '@midnight-smoker/test-util';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {
  DEFAULT_PKG_MANAGER_BIN,
  DEFAULT_PKG_MANAGER_VERSION,
} from '../../../../src/constants';
import {createFsMocks} from '../../mocks/fs';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('loader', function () {
        let sandbox: sinon.SinonSandbox;
        let loadPackageManagers: typeof PMLoader.loadPackageManagers;

        beforeEach(function () {
          sandbox = createSandbox();
          const {mocks} = createFsMocks();

          ({loadPackageManagers} = rewiremock.proxy(
            () =>
              require('../../../../src/component/pkg-manager/pkg-manager-loader'),
            mocks,
          ));
        });

        afterEach(function () {
          sandbox.restore();
        });

        // describe('findPackageManagers()', function () {
        //   let pkgManagerDefs: PkgManagerDef[];
        //   let pkgManagerSpecs: Readonly<PMS.PkgManagerSpec>[];

        //   beforeEach(function () {
        //     pkgManagerDefs = [nullPmDef];
        //     pkgManagerSpecs = [
        //       PkgManagerSpec.create({pkgManager: 'nullpm', version: '1.0.0'}),
        //     ];
        //   });

        //   describe('when pkgManagerDefs is empty', function () {
        //     it('should throw an InvalidArgError', async function () {
        //       expect(
        //         () => findPackageManagers([], pkgManagerSpecs),
        //         'to throw',
        //         {
        //           code: ErrorCodes.InvalidArgError,
        //           context: {argName: 'pkgManagerDefs', position: 0},
        //         },
        //       );
        //     });
        //   });

        //   describe('when provided no args', function () {
        //     it('should throw an InvalidArgError', async function () {
        //       expect(
        //         // @ts-expect-error - bad usage
        //         () => findPackageManagers(),
        //         'to throw',
        //         {
        //           code: ErrorCodes.InvalidArgError,
        //           context: {argName: 'pkgManagerDefs', position: 0},
        //         },
        //       );
        //     });
        //   });

        //   describe('when provided no specs', function () {
        //     it('should throw an InvalidArgError', async function () {
        //       expect(
        //         // @ts-expect-error - bad usage
        //         () => findPackageManagers([nullPmDef]),
        //         'to throw',
        //         {
        //           code: ErrorCodes.InvalidArgError,
        //           context: {argName: 'pkgManagerSpecs', position: 1},
        //         },
        //       );
        //     });
        //   });

        //   describe('when all pkgManagerSpecs can be matched with a PkgManagerDef', function () {
        //     it('should return a Map of PkgManagerSpec to PkgManagerDef', async function () {
        //       const result = findPackageManagers(
        //         pkgManagerDefs,
        //         pkgManagerSpecs,
        //       );
        //       expect(
        //         result,
        //         'to equal',
        //         new Map([
        //           [
        //             PkgManagerSpec.create({
        //               pkgManager: 'nullpm',
        //               version: '1.0.0',
        //             }),
        //             nullPmDef,
        //           ],
        //         ]),
        //       );
        //     });
        //   });

        //   describe('when a pkgManagerSpec cannot be matched with a PkgManagerDef', function () {
        //     it('should throw an UnsupportedPackageManagerError', async function () {
        //       const unmatchedSpec = new PkgManagerSpec({
        //         pkgManager: 'pnpm',
        //       });
        //       expect(
        //         () =>
        //           findPackageManagers(pkgManagerDefs, [
        //             ...pkgManagerSpecs,
        //             unmatchedSpec,
        //           ]),
        //         'to throw',
        //         {
        //           code: ErrorCodes.UnsupportedPackageManagerError,
        //           context: {name: 'pnpm', version: 'latest'},
        //         },
        //       );
        //     });
        //   });
        // });

        describe('loadPackageManagers()', function () {
          describe('when provided an unknown package manager', function () {
            it('should reject', function () {
              expect(
                () =>
                  loadPackageManagers([nullPmDef], {
                    desiredPkgManagers: ['pnpm'],
                  }),
                'to be rejected with error satisfying',
                {code: ErrorCodes.AggregateUnsupportedPkgManagerError},
              );
            });
          });

          describe('when provided no desired package managers', function () {
            beforeEach(function () {
              sandbox
                .stub(nullPmDef, 'accepts')
                .returns(DEFAULT_PKG_MANAGER_VERSION);
              nullPmDef.bin = DEFAULT_PKG_MANAGER_BIN;
            });

            it('should guess a package manager', async function () {
              await expect(
                loadPackageManagers([nullPmDef]).then((map) => [
                  ...map.values(),
                ]),
                'to be fulfilled with value satisfying',
                [
                  {
                    spec: {
                      pkgManager: DEFAULT_PKG_MANAGER_BIN,
                      version: DEFAULT_PKG_MANAGER_VERSION,
                      isSystem: false,
                    },
                    def: expect.it('to be', nullPmDef),
                  },
                ],
              );
            });
          });

          describe('when provided a version within the accepted range', function () {
            beforeEach(function () {
              sandbox.stub(nullPmDef, 'accepts').returns('1.0.0');
              nullPmDef.bin = 'nullpm';
            });

            it('should load the package manager', async function () {
              const res = await loadPackageManagers([nullPmDef], {
                desiredPkgManagers: ['nullpm@1'],
              }).then((map) => [...map.values()]);
              await expect(res, 'to satisfy', [
                {
                  spec: {
                    pkgManager: nullPmDef.bin,
                    version: '1.0.0',
                    isSystem: false,
                  },
                  def: expect.it('to be', nullPmDef),
                },
              ]);
            });
          });

          describe('when provided a version outside of the accepted range', function () {
            beforeEach(function () {
              sandbox.stub(nullPmDef, 'accepts').returns(undefined);
            });

            it('should reject', async function () {
              await expect(
                loadPackageManagers([nullPmDef], {
                  desiredPkgManagers: ['nullpm@3'],
                }),
                'to be rejected with error satisfying',
                {code: ErrorCodes.AggregateUnsupportedPkgManagerError},
              );
            });
          });
        });
      });
    });
  });
});
