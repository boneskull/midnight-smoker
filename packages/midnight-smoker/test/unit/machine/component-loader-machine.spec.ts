import {ERROR} from '#constants';
import {ErrorCode} from '#error/codes';
import {
  ComponentLoaderMachine,
  LoadableComponents,
} from '#machine/component-loader-machine';
import {INIT_ACTION} from '#machine/index';
import {PkgManagerLoaderMachine} from '#machine/pkg-manager-loader-machine';
import {OptionsParser} from '#options/options-parser';
import {PluginRegistry} from '#plugin/registry';
import {type SmokerOptions} from '#schema/smoker-options';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {FileManager} from '#util/filemanager';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {createDebug} from '../../debug';
import {nullPkgManager, nullReporter, nullRule} from '../mocks/component';
import {createPlugin} from '../mocks/plugin';

const expect = unexpected.clone();

const logger = createDebug(__filename);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('ComponentLoaderMachine', function () {
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let actor: Actor<typeof ComponentLoaderMachine>;
      let vol: Volume;
      let smokerOptions: SmokerOptions;
      let sandbox: sinon.SinonSandbox;
      let workspaceInfo: WorkspaceInfo[];

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({
          blessedPluginIds: ['test-plugin'],
          fileManager,
        });
        await pluginRegistry.registerPlugin('test-plugin', createPlugin());
        sandbox = createSandbox();
        workspaceInfo = [
          {
            localPath: '/path/to/package',
            pkgJson: {},
            pkgJsonPath: '/path/to/package/package.json',
            pkgName: 'example-package',
          } as WorkspaceInfo,
        ];
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('component handling', function () {
        beforeEach(async function () {
          await pluginRegistry.registerPlugin('test-plugin2', {
            plugin(api) {
              api
                .defineReporter({...nullReporter})
                .definePackageManager({...nullPkgManager})
                .defineRule({...nullRule});
            },
          });
          smokerOptions = OptionsParser.buildSmokerOptionsSchema(
            pluginRegistry,
          ).parse({
            pkgManager: 'nullpm',
            reporter: 'test-reporter',
          });
        });

        describe('when not provided a "component" option', function () {
          it('should load all components', async function () {
            actor = createActor(ComponentLoaderMachine, {
              input: {
                fileManager,
                pluginRegistry,
                smokerOptions,
                workspaceInfo,
              },
              logger,
            });
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                pkgManagerEnvelopes: expect
                  .it('to be an array')
                  .and('not to be empty'),
                reporterEnvelopes: expect
                  .it('to be an array')
                  .and('not to be empty'),
                ruleEnvelopes: expect
                  .it('to be an array')
                  .and('not to be empty'),
              },
            );
          });
        });

        describe('when "component" option is "reporter"', function () {
          it('should load only reporters', async function () {
            actor = createActor(ComponentLoaderMachine, {
              input: {
                component: LoadableComponents.Reporters,
                fileManager,
                pluginRegistry,
                smokerOptions,
                workspaceInfo,
              },
              logger,
            });
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                pkgManagerEnvelopes: [],
                reporterEnvelopes: expect
                  .it('to be an array')
                  .and('not to be empty'),
                ruleEnvelopes: [],
              },
            );
          });
        });

        describe('when "component" option is "pkgManagers"', function () {
          it('should load only package managers', async function () {
            actor = createActor(ComponentLoaderMachine, {
              input: {
                component: LoadableComponents.PkgManagers,
                fileManager,
                pluginRegistry,
                smokerOptions,
                workspaceInfo,
              },
              logger,
            });
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                pkgManagerEnvelopes: expect
                  .it('to be an array')
                  .and('not to be empty'),
                reporterEnvelopes: expect.it('to be empty'),
                ruleEnvelopes: expect.it('to be empty'),
              },
            );
          });
        });

        describe('when "component" option is "rules"', function () {
          it('should load only rules', async function () {
            actor = createActor(ComponentLoaderMachine, {
              input: {
                component: LoadableComponents.Rules,
                fileManager,
                pluginRegistry,
                smokerOptions,
                workspaceInfo,
              },
              logger,
            });
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                pkgManagerEnvelopes: [],
                reporterEnvelopes: [],
                ruleEnvelopes: expect
                  .it('to be an array')
                  .and('not to be empty'),
              },
            );
          });
        });
      });

      describe('reporter handling', function () {
        it('should init the desired reporter(s)', async function () {
          const reporter = {...nullReporter, name: 'test-reporter-2'};
          await pluginRegistry.registerPlugin('test-plugin3', {
            plugin(api) {
              api.defineReporter({...nullReporter}).defineReporter(reporter);
            },
          });
          smokerOptions = OptionsParser.buildSmokerOptionsSchema(
            pluginRegistry,
          ).parse({
            pkgManager: 'nullpm',
            reporter: 'test-plugin3/test-reporter-2',
          });

          const actor = createActor(ComponentLoaderMachine, {
            input: {
              component: LoadableComponents.Reporters,
              fileManager,
              pluginRegistry,
              smokerOptions,
              workspaceInfo,
            },
            logger,
          });

          await expect(
            runUntilDone(actor),
            'to be fulfilled with value satisfying',
            {
              reporterEnvelopes: [
                {
                  reporter,
                },
              ],
            },
          );
        });

        it('should init based on "when" condition', async function () {
          const nullReporter2 = {
            ...nullReporter,
            name: 'test-reporter-2',
            when: () => true,
          };
          await pluginRegistry.registerPlugin('test-plugin4', {
            plugin(api) {
              api
                .defineReporter({...nullReporter})
                .defineReporter(nullReporter2);
            },
          });
          smokerOptions = OptionsParser.buildSmokerOptionsSchema(
            pluginRegistry,
          ).parse({
            pkgManager: 'nullpm',
            reporter: ['test-plugin4/test-reporter'],
          });

          actor = createActor(ComponentLoaderMachine, {
            input: {
              component: LoadableComponents.Reporters,
              fileManager,
              pluginRegistry,
              smokerOptions,
              workspaceInfo,
            },
            logger,
          });
          await expect(
            runUntilDone(actor),
            'to be fulfilled with value satisfying',
            {
              reporterEnvelopes: [
                {
                  reporter: nullReporter,
                },
                {
                  reporter: nullReporter2,
                },
              ],
            },
          );
        });

        describe('when "when" throws', function () {
          it('should exit with error output', async function () {
            const error = new Error('foo');
            await pluginRegistry.registerPlugin('test-plugin5', {
              plugin(api) {
                api.defineReporter({
                  ...nullReporter,
                  when: () => {
                    throw error;
                  },
                });
              },
            });
            smokerOptions = OptionsParser.buildSmokerOptionsSchema(
              pluginRegistry,
            ).parse({
              pkgManager: 'nullpm',
            });

            const actor = createActor(ComponentLoaderMachine, {
              input: {
                component: LoadableComponents.Reporters,
                fileManager,
                pluginRegistry,
                smokerOptions,
                workspaceInfo,
              },
              logger,
            });
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                actorId: expect.it('to be a string'),
                error: {
                  code: ErrorCode.MachineError,
                  errors: [
                    {
                      cause: error,
                      code: ErrorCode.ReporterError,
                    },
                  ],
                },
                type: ERROR,
              },
            );
          });
        });
      });

      describe('pkg manager handling', function () {
        describe('when loading package managers fails', function () {
          it('should exit with error output', async function () {
            actor = createActor(
              ComponentLoaderMachine.provide({
                actors: {
                  PkgManagerLoaderMachine: PkgManagerLoaderMachine.provide({
                    actions: {
                      [INIT_ACTION]: () => {
                        throw new Error('foo');
                      },
                    },
                  }),
                },
              }),
              {
                input: {
                  component: LoadableComponents.PkgManagers,
                  fileManager,
                  pluginRegistry,
                  smokerOptions,
                  workspaceInfo,
                },
                logger,
              },
            );

            await pluginRegistry.registerPlugin('test-plugin6', {
              plugin(api) {
                api.definePackageManager({...nullPkgManager});
              },
            });
            smokerOptions = OptionsParser.buildSmokerOptionsSchema(
              pluginRegistry,
            ).parse({
              pkgManager: 'nullpm',
            });

            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                actorId: expect.it('to be a string'),
                error: expect.it('to be an', Error),
                type: ERROR,
              },
            );
          });
        });
      });
    });
  });
});
