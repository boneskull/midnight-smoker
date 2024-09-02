import {
  queryWorkspacesLogic,
  type QueryWorkspacesLogicInput,
} from '#machine/actor/query-workspaces';
import {FileManager} from '#util/filemanager';
import {type IFs, memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import unexpected from 'unexpected';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {monorepoStructure, monorepoWorkspaces} from '../../mocks/volume';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('actor', function () {
      describe('queryWorkspacesLogic', function () {
        let vol: Volume;
        let fs: IFs;
        let fileManager: FileManager;
        let input: QueryWorkspacesLogicInput;
        let actor: Actor<typeof queryWorkspacesLogic>;

        beforeEach(function () {
          ({fs, vol} = memfs());
          fileManager = FileManager.create({fs: fs as any});
          vol.fromJSON(monorepoStructure);
        });

        describe('when handling a monorepo', function () {
          describe('when "all" flag enabled', function () {
            beforeEach(function () {
              input = {
                all: true,
                cwd: '/',
                fileManager,
              };
              actor = createActor(queryWorkspacesLogic, {input});
            });

            describe('when workspace pattern matches a thing that is not a directory', function () {
              beforeEach(function () {
                vol.fromJSON({
                  '/packages/herp': 'derp',
                });
              });

              it('should not return a workspace for that thing', async function () {
                const workspaces = await runUntilDone(actor);
                expect(workspaces, 'to equal', monorepoWorkspaces);
              });
            });

            it('should return an array of WorkspaceInfo objects for all workspaces', async function () {
              const workspaces = await runUntilDone(actor);
              expect(workspaces, 'to equal', monorepoWorkspaces);
            });

            describe('when workspace prop is an object', function () {
              beforeEach(function () {
                vol.fromJSON({
                  '/package.json': JSON.stringify({
                    name: 'monorepo',
                    private: true,
                    version: '1.0.0',
                    workspaces: {
                      nohoist: ['packages/*'],
                      packages: ['packages/*'],
                    },
                  }),
                });
              });

              it('should return an array of WorkspaceInfo objects for all workspaces', async function () {
                const workspaces = await runUntilDone(actor);
                expect(workspaces, 'to satisfy', [
                  {
                    localPath: '/packages/package-c',
                    pkgJson: {
                      main: 'index.js',
                      name: 'package-c',
                      version: '1.0.0',
                    },
                    pkgJsonPath: '/packages/package-c/package.json',
                    pkgName: 'package-c',
                    private: false,
                  },
                  {
                    localPath: '/packages/package-b',
                    pkgJson: {
                      main: 'index.js',
                      name: 'package-b',
                      version: '1.0.0',
                    },
                    pkgJsonPath: '/packages/package-b/package.json',
                    pkgName: 'package-b',
                    private: false,
                  },
                  {
                    localPath: '/packages/package-a',
                    pkgJson: {
                      main: 'index.js',
                      name: 'package-a',
                      version: '1.0.0',
                    },
                    pkgJsonPath: '/packages/package-a/package.json',
                    pkgName: 'package-a',
                    private: false,
                  },
                ]);
              });
            });
          });

          describe('when filtered by package name', function () {
            beforeEach(function () {
              input = {
                all: false,
                cwd: '/',
                fileManager,
                workspace: ['package-c'],
              };
              actor = createActor(queryWorkspacesLogic, {input});
            });

            it('should return an array of WorkspaceInfo objects for matching  workspace(s)', async function () {
              const workspaces = await runUntilDone(actor);
              expect(workspaces, 'to satisfy', [
                {
                  localPath: '/packages/package-c',
                  pkgJson: {
                    main: 'index.js',
                    name: 'package-c',
                    version: '1.0.0',
                  },
                  pkgJsonPath: '/packages/package-c/package.json',
                  pkgName: 'package-c',
                  private: false,
                },
              ]);
            });
          });

          describe('when filtered by package path', function () {
            beforeEach(function () {
              input = {
                all: false,
                cwd: '/',
                fileManager,
                workspace: ['./packages/package-c'],
              };
              actor = createActor(queryWorkspacesLogic, {input});
            });

            it('should return an array of WorkspaceInfo objects for matching  workspace(s)', async function () {
              const workspaces = await runUntilDone(actor);
              expect(workspaces, 'to satisfy', [
                {
                  localPath: '/packages/package-c',
                  pkgJson: {
                    main: 'index.js',
                    name: 'package-c',
                    version: '1.0.0',
                  },
                  pkgJsonPath: '/packages/package-c/package.json',
                  pkgName: 'package-c',
                  private: false,
                },
              ]);
            });
          });

          describe('when filtered by absolute package path', function () {
            beforeEach(function () {
              input = {
                all: false,
                cwd: '/',
                fileManager,
                workspace: ['/packages/package-c'],
              };
              actor = createActor(queryWorkspacesLogic, {input});
            });

            it('should return an array of WorkspaceInfo objects for matching  workspace(s)', async function () {
              const workspaces = await runUntilDone(actor);
              expect(workspaces, 'to satisfy', [
                {
                  localPath: '/packages/package-c',
                  pkgJson: {
                    main: 'index.js',
                    name: 'package-c',
                    version: '1.0.0',
                  },
                  pkgJsonPath: '/packages/package-c/package.json',
                  pkgName: 'package-c',
                  private: false,
                },
              ]);
            });
          });
        });

        describe('when handling a single project', function () {
          beforeEach(function () {
            input = {
              all: false,
              cwd: '/packages/package-a',
              fileManager,
            };
            actor = createActor(queryWorkspacesLogic, {input});
          });

          it('should return an array containing a single WorkspaceInfo object', async function () {
            const workspaces = await runUntilDone(actor);
            expect(workspaces, 'to satisfy', [
              {
                localPath: '/packages/package-a',
                pkgJson: {
                  main: 'index.js',
                  name: 'package-a',
                  version: '1.0.0',
                },
                pkgJsonPath: '/packages/package-a/package.json',
                pkgName: 'package-a',
                private: false,
              },
            ]);
          });
        });
      });
    });
  });
});
