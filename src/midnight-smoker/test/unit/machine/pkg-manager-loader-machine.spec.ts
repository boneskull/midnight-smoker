import {OK, SYSTEM} from '#constants';
import {
  PkgManagerLoaderMachine,
  type PkgManagerLoaderMachineInput,
} from '#machine/pkg-manager-loader-machine';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {PluginRegistry} from '#plugin/registry';
import {type PkgManager} from '#schema/pkg-manager';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {FileManager} from '#util/filemanager';
import execa from 'execa';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume.js';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {createDebug} from '../../debug.js';
import {nullPkgManager, nullPkgManagerSpec} from '../mocks/component.js';
import {createPlugin} from '../mocks/plugin.js';

const expect = unexpected.clone().use(unexpectedSinon);
const logger = createDebug(__filename);

function pathKey(options: {env?: object; platform?: NodeJS.Platform} = {}) {
  const {env = process.env, platform = process.platform} = options;

  if (platform !== 'win32') {
    return 'PATH';
  }

  return (
    Object.keys(env)
      .reverse()
      .find((key) => key.toUpperCase() === 'PATH') || 'Path'
  );
}

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('PkgManagerLoaderMachine', function () {
      let pkgManager: PkgManager;
      let sandbox: sinon.SinonSandbox;
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      const id = 'PkgManagerLoaderMachine';
      let plugin: Readonly<PluginMetadata>;
      let input: PkgManagerLoaderMachineInput;
      let actor: Actor<typeof PkgManagerLoaderMachine>;
      let workspaceInfo: WorkspaceInfo[];

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pkgManager = {...nullPkgManager};
        const pluginDef = createPlugin({
          pkgManager,
        });
        sandbox = createSandbox();
        pluginRegistry = PluginRegistry.create({
          fileManager,
        });
        plugin = await pluginRegistry.registerPlugin('test-plugin', pluginDef);

        workspaceInfo = [
          {
            localPath: '/',
            pkgJson: {
              name: 'example-package',
              version: '1.0.0',
            },
            pkgJsonPath: '/package.json',
            pkgName: 'example-package',
          } as WorkspaceInfo,
        ];
        vol.fromJSON({
          '/package.json': JSON.stringify(workspaceInfo[0].pkgJson),
        });
        input = {
          componentRegistry: pluginRegistry.componentRegistry,
          desiredPkgManagers: [],
          fileManager,
          plugins: [plugin],
          workspaceInfo,
        };
      });

      afterEach(function () {
        sandbox.restore();
        vol?.reset();
      });

      describe('when provided an unknown package manager', function () {
        beforeEach(function () {
          actor = createActor(PkgManagerLoaderMachine, {
            id,
            input: {
              ...input,
              desiredPkgManagers: ['monkeypm'],
              workspaceInfo,
            },
            logger,
          });
        });

        it('should fulfill with no envelopes and an array of unsupported package managers', async function () {
          await expect(
            () => runUntilDone(actor),
            'to be fulfilled with value satisfying',
            {
              desiredPkgManagers: ['monkeypm'],
              envelopes: expect.it('to be empty'),
              type: OK,
              unsupported: ['monkeypm'],
            },
          );
        });
      });

      describe('when provided no desired package managers', function () {
        beforeEach(function () {
          actor = createActor(PkgManagerLoaderMachine, {
            id,
            input: {
              ...input,
              desiredPkgManagers: [],
              workspaceInfo,
            },
            logger,
          });
        });

        describe('and no system package managers exist', function () {
          beforeEach(function () {
            const commandStub = sandbox.stub(execa, 'command');
            commandStub.onFirstCall().resolves({stdout: ''} as any);
          });

          it(`should fulfill with no envelopes and an unsupported ${SYSTEM} package manager`, async function () {
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                desiredPkgManagers: [SYSTEM],
                envelopes: expect.it('to be empty'),
                type: OK,
                unsupported: [SYSTEM],
              },
            );
          });
        });

        describe('when a system package manager exists', function () {
          let envPath: string | undefined;

          beforeEach(function () {
            envPath = process.env[pathKey()];
            process.env[pathKey()] =
              path.resolve(__dirname, '..', 'mocks') +
              path.delimiter +
              (envPath ?? '');
            actor = createActor(PkgManagerLoaderMachine, {
              id,
              input: {
                ...input,
                desiredPkgManagers: [],
                workspaceInfo,
              },
              logger,
            });

            const commandStub = sandbox.stub(execa, 'command');
            commandStub.onFirstCall().resolves({stdout: '1.0.0'} as any);
          });

          afterEach(function () {
            process.env[pathKey()] = envPath;
          });

          describe('when a lockfile exists', function () {
            beforeEach(function () {
              vol.fromJSON({
                '/nullpm.lock': '',
              });
            });

            it('should choose package manager based on lockfile', async function () {
              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  desiredPkgManagers: [`nullpm@${SYSTEM}`],
                  envelopes: [
                    {
                      pkgManager,
                      spec: {
                        ...nullPkgManagerSpec.toJSON(),
                        bin: expect.it(
                          'to end with',
                          path.join('mocks', 'nullpm'),
                        ),
                        label: `${nullPkgManagerSpec.label} (${SYSTEM})`,
                        requestedAs: undefined,
                        version: '1.0.0',
                      },
                    },
                  ],
                  type: OK,
                  unsupported: [],
                },
              );
            });
          });

          describe('when no lockfile exists', function () {
            it('should find whatever system pkg manager is available', async function () {
              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  desiredPkgManagers: [SYSTEM],
                  envelopes: [
                    {
                      pkgManager,
                      spec: {
                        ...nullPkgManagerSpec.toJSON(),
                        bin: expect.it(
                          'to end with',
                          path.join('mocks', 'nullpm'),
                        ),
                        label: `${nullPkgManagerSpec.label} (${SYSTEM})`,
                        requestedAs: undefined,
                        version: '1.0.0',
                      },
                    },
                  ],
                  type: OK,
                  unsupported: [],
                },
              );
            });
          });

          describe('when provided an in-range system package manager', function () {
            beforeEach(function () {
              actor = createActor(PkgManagerLoaderMachine, {
                id,
                input: {
                  ...input,
                  desiredPkgManagers: ['nullpm@1'],
                  workspaceInfo,
                },
                logger,
              });
            });

            it('should load the package manager', async function () {
              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  desiredPkgManagers: ['nullpm@1'],
                  envelopes: [
                    {
                      pkgManager,
                      spec: {
                        ...nullPkgManagerSpec.toJSON(),
                        bin: expect.it(
                          'to end with',
                          path.join('mocks', 'nullpm'),
                        ),
                        label: `${nullPkgManagerSpec.label} (${SYSTEM})`,
                        requestedAs: 'nullpm@1',
                        version: '1.0.0',
                      },
                    },
                  ],
                  type: OK,
                  unsupported: [],
                },
              );
            });
          });
        });
      });

      describe('when provided a version outside of the accepted range', function () {
        beforeEach(function () {
          actor = createActor(PkgManagerLoaderMachine, {
            id,
            input: {
              ...input,
              desiredPkgManagers: ['nullpm@2'],
              workspaceInfo,
            },
            logger,
          });
        });

        it('should return the desired pkg manager as unsupported', async function () {
          await expect(
            () => runUntilDone(actor),
            'to be fulfilled with value satisfying',
            {
              desiredPkgManagers: ['nullpm@2'],
              envelopes: expect.it('to be empty'),
              type: OK,
              unsupported: ['nullpm@2'],
            },
          );
        });
      });
    });
  });
});
