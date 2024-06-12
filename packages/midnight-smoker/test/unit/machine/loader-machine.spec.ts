import {ERROR} from '#constants';
import {ErrorCodes} from '#error/codes';
import {LoadableComponents, LoaderMachine} from '#machine/loader';
import {type SmokerOptions} from '#options/options';
import {OptionParser} from '#options/parser';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {PluginRegistry} from '#plugin/plugin-registry';
import {type WorkspaceInfo} from '#schema/workspaces';
import {FileManager} from '#util/filemanager';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {nullPkgManagerDef, nullReporter, nullRule} from '../mocks/component';
import {createActorRunner} from './actor-helpers';

const expect = unexpected.clone();

const {run: runMachine} = createActorRunner(LoaderMachine);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('LoaderMachine', function () {
      let plugin: Readonly<PluginMetadata>;
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      let smokerOptions: SmokerOptions;
      let sandbox: sinon.SinonSandbox;
      let workspaceInfo: WorkspaceInfo[];

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({fileManager});
        sandbox = createSandbox();
        workspaceInfo = [
          {
            pkgName: 'example-package',
            localPath: '/path/to/package',
            pkgJson: {},
            pkgJsonPath: '/path/to/package/package.json',
          } as WorkspaceInfo,
        ];
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('component handling', function () {
        beforeEach(async function () {
          plugin = await pluginRegistry.registerPlugin('test-plugin', {
            plugin(api) {
              api
                .defineReporter(nullReporter)
                .definePackageManager(nullPkgManagerDef)
                .defineRule(nullRule);
            },
          });
          smokerOptions = OptionParser.buildSmokerOptionsSchema(
            pluginRegistry,
          ).parse({
            pkgManager: 'nullpm',
            reporter: 'test-plugin/test-reporter',
          });
        });

        describe('when not provided a "component" option', function () {
          it('should load all components', async function () {
            await expect(
              runMachine({
                plugin,
                workspaceInfo,
                pluginRegistry,
                smokerOptions,
              }),
              'to be fulfilled with value satisfying',
              {
                pkgManagerInitPayloads: expect
                  .it('to be an array')
                  .and('not to be empty'),
                reporterInitPayloads: expect
                  .it('to be an array')
                  .and('not to be empty'),
                ruleInitPayloads: expect
                  .it('to be an array')
                  .and('not to be empty'),
              },
            );
          });
        });

        describe('when "component" option is "reporter"', function () {
          it('should load only reporters', async function () {
            await expect(
              runMachine({
                plugin,
                workspaceInfo,
                pluginRegistry,
                smokerOptions,
                component: LoadableComponents.Reporters,
              }),
              'to be fulfilled with value satisfying',
              {
                pkgManagerInitPayloads: [],
                reporterInitPayloads: expect
                  .it('to be an array')
                  .and('not to be empty'),
                ruleInitPayloads: [],
              },
            );
          });
        });

        describe('when "component" option is "pkgManagers"', function () {
          it('should load only package managers', async function () {
            await expect(
              runMachine({
                plugin,
                workspaceInfo,
                pluginRegistry,
                smokerOptions,
                component: LoadableComponents.PkgManagers,
              }),
              'to be fulfilled with value satisfying',
              {
                pkgManagerInitPayloads: expect
                  .it('to be an array')
                  .and('not to be empty'),
                reporterInitPayloads: [],
                ruleInitPayloads: [],
              },
            );
          });
        });

        describe('when "component" option is "rules"', function () {
          it('should load only rules', async function () {
            await expect(
              runMachine({
                plugin,
                pluginRegistry,
                workspaceInfo,
                smokerOptions,
                component: LoadableComponents.Rules,
              }),
              'to be fulfilled with value satisfying',
              {
                pkgManagerInitPayloads: [],
                reporterInitPayloads: [],
                ruleInitPayloads: expect
                  .it('to be an array')
                  .and('not to be empty'),
              },
            );
          });
        });
      });

      describe('reporter handling', function () {
        it('should init the desired reporter(s)', async function () {
          plugin = await pluginRegistry.registerPlugin('test-plugin', {
            plugin(api) {
              api
                .defineReporter(nullReporter)
                .defineReporter({...nullReporter, name: 'test-reporter-2'});
            },
          });
          smokerOptions = OptionParser.buildSmokerOptionsSchema(
            pluginRegistry,
          ).parse({
            pkgManager: 'nullpm',
            reporter: 'test-plugin/test-reporter',
          });

          await expect(
            runMachine({
              plugin,
              workspaceInfo,
              pluginRegistry,
              smokerOptions,
              component: LoadableComponents.Reporters,
            }),
            'to be fulfilled with value satisfying',
            {
              reporterInitPayloads: [
                {
                  def: nullReporter,
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
          plugin = await pluginRegistry.registerPlugin('test-plugin', {
            plugin(api) {
              api.defineReporter(nullReporter).defineReporter(nullReporter2);
            },
          });
          smokerOptions = OptionParser.buildSmokerOptionsSchema(
            pluginRegistry,
          ).parse({
            pkgManager: 'nullpm',
            reporter: ['test-plugin/test-reporter'],
          });

          await expect(
            runMachine({
              workspaceInfo,
              plugin,
              pluginRegistry,
              smokerOptions,
              component: LoadableComponents.Reporters,
            }),
            'to be fulfilled with value satisfying',
            {
              reporterInitPayloads: [
                {
                  def: nullReporter,
                },
                {
                  def: nullReporter2,
                },
              ],
            },
          );
        });

        describe('when "when" throws', function () {
          it('should exit with error output', async function () {
            const error = new Error('foo');
            plugin = await pluginRegistry.registerPlugin('test-plugin', {
              plugin(api) {
                api.defineReporter({
                  ...nullReporter,
                  when: () => {
                    throw error;
                  },
                });
              },
            });
            smokerOptions = OptionParser.buildSmokerOptionsSchema(
              pluginRegistry,
            ).parse({
              pkgManager: 'nullpm',
            });

            await expect(
              runMachine({
                plugin,
                pluginRegistry,
                smokerOptions,
                component: LoadableComponents.Reporters,
                workspaceInfo,
              }),
              'to be fulfilled with value satisfying',
              {
                type: ERROR,
                error: {
                  code: ErrorCodes.MachineError,
                  errors: [error],
                },
                id: expect.it('to be a string'),
              },
            );
          });
        });
      });

      describe('pkg manager handling', function () {
        describe('when loading package managers fails', function () {
          it('should exit with error output', async function () {
            plugin = await pluginRegistry.registerPlugin('test-plugin', {
              plugin(api) {
                api.definePackageManager(nullPkgManagerDef);
              },
            });
            smokerOptions = OptionParser.buildSmokerOptionsSchema(
              pluginRegistry,
            ).parse({
              pkgManager: 'nullpm',
            });

            // this will cause plugin.loadPkgManagers to throw, because
            // it expects pkgManagerDefMap to be non-empty
            plugin.pkgManagerDefMap.clear();

            await expect(
              runMachine({
                plugin,
                pluginRegistry,
                workspaceInfo,
                smokerOptions,
                component: LoadableComponents.PkgManagers,
              }),
              'to be fulfilled with value satisfying',
              {
                error: expect.it('to be an', Error),
                type: ERROR,
                id: expect.it('to be a string'),
              },
            );
          });
        });
      });
    });
  });
});
