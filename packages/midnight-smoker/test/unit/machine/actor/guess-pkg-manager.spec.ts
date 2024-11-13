import {DEFAULT_PKG_MANAGER_NAME, SYSTEM} from '#constants';
import {type PkgManager} from '#defs/pkg-manager';
import {
  guessPkgManagerLogic,
  type GuessPkgManagerLogicInput,
} from '#machine/actor/guess-pkg-manager';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {FileManager} from '#util/filemanager';
import {type IFs, memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {nullPkgManager} from '../../mocks';
import {monorepoStructure} from '../../mocks/volume';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('actor', function () {
      describe('guessPkgManagerLogic', function () {
        let vol: Volume;
        let fs: IFs;
        let fileManager: FileManager;
        let input: GuessPkgManagerLogicInput;
        let actor: ReturnType<typeof createActor>;
        let sandbox: sinon.SinonSandbox;
        const pkgManagers: PkgManager[] = [
          {...nullPkgManager, lockfile: 'yarn.lock', name: 'yarn'},
          {
            ...nullPkgManager,
            lockfile: 'package-lock.json',
            name: 'npm',
          },
        ];
        let workspaceInfo: WorkspaceInfo[];

        beforeEach(function () {
          ({fs, vol} = memfs());
          fileManager = FileManager.create({fs: fs as any});
          vol.fromJSON(monorepoStructure);
          sandbox = sinon.createSandbox();
          workspaceInfo = [
            {
              localPath: '/',
              pkgJson: {
                name: 'example-package',
                version: '1.0.0',
              },
              pkgJsonPath: '/package.json',
              pkgName: 'example-package',
            },
          ] as any;
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('when packageManager field is present in package.json', function () {
          beforeEach(function () {
            workspaceInfo[0]!.pkgJson.packageManager = 'npm@7.20.0';
            input = {
              fileManager,
              plugins: [],
              workspaceInfo,
            };
            actor = createActor(guessPkgManagerLogic, {input});
          });

          it('should return the packageManager field', async function () {
            const result = await runUntilDone(actor);
            expect(result, 'to equal', 'npm@7.20.0');
          });
        });

        describe('when no packageManager field is present in package.json', function () {
          beforeEach(function () {
            input = {
              fileManager,
              plugins: [],
              workspaceInfo,
            };
            actor = createActor(guessPkgManagerLogic, {input});
          });

          it(`should return the ${SYSTEM} package manager`, async function () {
            const result = await runUntilDone(actor);
            expect(result, 'to equal', SYSTEM);
          });

          describe('when no lockfile is present', function () {
            beforeEach(function () {
              input = {
                fileManager,
                plugins: [
                  {
                    pkgManagers,
                  } as any,
                ],
                workspaceInfo,
              };
              actor = createActor(guessPkgManagerLogic, {input});
            });

            it('should return the system default package manager', async function () {
              const result = await runUntilDone(actor);
              expect(result, 'to equal', SYSTEM);
            });
          });
        });

        describe('when a lockfile is present', function () {
          beforeEach(function () {
            input = {
              fileManager,
              plugins: [
                {
                  pkgManagers,
                } as any,
              ],
              workspaceInfo,
            };
            vol.fromJSON({
              '/yarn.lock': '',
            });
            actor = createActor(guessPkgManagerLogic, {input});
          });

          it(`should return the package manager from the lockfile with the ${SYSTEM} version`, async function () {
            const result = await runUntilDone(actor);
            expect(result, 'to equal', `yarn@${SYSTEM}`);
          });
        });

        describe('when multiple lockfiles are present', function () {
          beforeEach(function () {
            input = {
              fileManager,
              plugins: [
                {
                  pkgManagers,
                } as any,
              ],
              workspaceInfo,
            };
            vol.fromJSON({
              '/package-lock.json': '',
              '/yarn.lock': '',
            });
            actor = createActor(guessPkgManagerLogic, {input});
          });

          describe('when one is the default package manager', function () {
            it('should return the default package manager', async function () {
              const result = await runUntilDone(actor);
              expect(
                result,
                'to equal',
                `${DEFAULT_PKG_MANAGER_NAME}@${SYSTEM}`,
              );
            });
          });

          describe('when no default package manager is present', function () {
            beforeEach(function () {
              vol.fromJSON({
                '/nullpm.lock': '',
                '/yarn.lock': '',
              });
            });

            it('should return whatever', async function () {
              const result = await runUntilDone(actor);
              expect(result, 'to match', new RegExp(`@${SYSTEM}`));
            });
          });
        });
      });
    });
  });
});
