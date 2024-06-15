import {DEFAULT_PKG_MANAGER_BIN, DEFAULT_PKG_MANAGER_VERSION} from '#constants';
import type * as PMLoader from '#pkg-manager/pkg-manager-loader';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type WorkspaceInfo} from '#schema/workspace-info';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {
  nullPkgManagerDef as _nullPkgManagerDef,
  nullPkgManagerSpec,
} from '../../mocks/component';
import {createFsMocks} from '../../mocks/fs';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('loader', function () {
        let nullPkgManagerDef: PkgManagerDef;
        let sandbox: sinon.SinonSandbox;
        let loadPackageManagers: typeof PMLoader.loadPackageManagers;

        beforeEach(function () {
          sandbox = createSandbox();
          const {mocks} = createFsMocks();
          nullPkgManagerDef = {..._nullPkgManagerDef};

          ({loadPackageManagers} = rewiremock.proxy(
            () => require('#pkg-manager/pkg-manager-loader'),
            mocks,
          ));
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('loadPackageManagers()', function () {
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
          describe('when provided an unknown package manager', function () {
            it('should fulfill with an empty array', function () {
              expect(
                () =>
                  loadPackageManagers([nullPkgManagerDef], workspaceInfo, {
                    desiredPkgManagers: ['pnpm'],
                  }),
                'to be fulfilled with value satisfying',
                expect.it('to be empty').and('to be an array'),
              );
            });
          });

          describe('when provided no desired package managers', function () {
            beforeEach(function () {
              sandbox
                .stub(nullPkgManagerDef, 'accepts')
                .returns(DEFAULT_PKG_MANAGER_VERSION);
              nullPkgManagerDef.bin = DEFAULT_PKG_MANAGER_BIN;
            });

            it('should return a pkg manager spec', async function () {
              await expect(
                loadPackageManagers([nullPkgManagerDef], workspaceInfo).then(
                  (map) => [...map.values()],
                ),
                'to be fulfilled with value satisfying',
                [
                  {
                    spec: {
                      bin: nullPkgManagerDef.bin,
                      version: expect.it('to be a string'),
                      isSystem: true,
                    },
                    def: expect.it('to be', nullPkgManagerDef),
                  },
                ],
              );
            });
          });

          describe('when provided a version within the accepted range', function () {
            beforeEach(function () {
              sandbox.stub(nullPkgManagerDef, 'accepts').returns('1.0.0');
            });

            it('should load the package manager', async function () {
              const res = await loadPackageManagers(
                [nullPkgManagerDef],
                workspaceInfo,
                {
                  desiredPkgManagers: ['nullpm@1'],
                },
              ).then((map) => [...map.values()]);
              await expect(res, 'to satisfy', [
                {
                  spec: {
                    ...nullPkgManagerSpec.toJSON(),
                    requestedAs: 'nullpm@1',
                  },
                  def: expect.it('to be', nullPkgManagerDef),
                },
              ]);
            });
          });

          describe('when provided a version outside of the accepted range', function () {
            beforeEach(function () {
              sandbox.stub(nullPkgManagerDef, 'accepts').returns(undefined);
            });

            it('should return an empty array', async function () {
              await expect(
                loadPackageManagers([nullPkgManagerDef], workspaceInfo, {
                  desiredPkgManagers: ['nullpm@3'],
                }),
                'to be fulfilled with value satisfying',
                expect.it('to be empty').and('to be an array'),
              );
            });
          });
        });
      });
    });
  });
});
