import type * as Reg from '#plugin/registry';

import {DEFAULT_COMPONENT_ID, DEFAULT_EXECUTOR_ID} from '#constants';
import {ErrorCode} from '#error/codes';
import {BLESSED_PLUGINS} from '#plugin/blessed';
import {PluginMetadata} from '#plugin/plugin-metadata';
import {PluginRegistry} from '#plugin/registry';
import {FileManager} from '#util/filemanager';
import {type IFs, memfs} from 'memfs';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';

const DEFAULT_TEST_PLUGIN_NAME = 'test-plugin';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('plugin', function () {
    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
      sandbox = createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('PluginRegistry', function () {
      let fs: IFs;
      let fileManager: FileManager;

      beforeEach(async function () {
        ({fs} = memfs());
        fileManager = FileManager.create({fs: fs as any});
      });

      describe('static method', function () {
        describe('create()', function () {
          it('should return an instance of PluginRegistry', function () {
            const registry = PluginRegistry.create();
            expect(registry, 'to be a', PluginRegistry);
          });
        });
      });

      describe('property', function () {
        let registry: PluginRegistry;

        beforeEach(function () {
          registry = PluginRegistry.create({
            fileManager,
          });
        });

        describe('isClosed', function () {
          it('needs a test');
        });

        describe('isOpen', function () {
          it('needs a test');
        });

        describe('plugins', function () {
          describe('when no plugins have been registered', function () {
            it('should return an empty array', function () {
              expect(registry.plugins, 'to be empty');
            });
          });

          describe('when a plugin has been registered', function () {
            beforeEach(async function () {
              await registry.registerPlugin(DEFAULT_TEST_PLUGIN_NAME, {
                description: 'some description',
                name: DEFAULT_TEST_PLUGIN_NAME,
                plugin: () => {},
                version: '0.0.0',
              });
            });

            it('should return a non-empty array of PluginMetadata objects', async function () {
              expect(registry.plugins, 'not to be empty');
            });
          });
        });
      });

      describe('method', function () {
        let registry: Reg.PluginRegistry;

        beforeEach(function () {
          registry = PluginRegistry.create();
        });

        describe('registerPlugin()', function () {
          it('should register a plugin and return its metadata', async function () {
            const pluginObject = {plugin: () => {}};
            const metadata = await registry.registerPlugin(
              'test-plugin',
              pluginObject,
            );
            expect(metadata, 'to satisfy', {id: 'test-plugin'});
            expect(registry.plugins, 'to contain', metadata);
          });

          describe('when a plugin with the same name but different value is already registered', function () {
            it('should reject', async function () {
              const pluginA = {plugin: () => {}};
              const pluginB = {plugin: () => {}};
              await registry.registerPlugin('test-plugin', pluginA);
              await expect(
                registry.registerPlugin('test-plugin', pluginB),
                'to be rejected with error satisfying',
                {
                  code: ErrorCode.MachineError,
                  errors: [{code: ErrorCode.PluginConflictError}],
                },
              );
            });
          });

          describe.skip('when the plugin cannot be found', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error FIXME
                registry.registerPlugin('/path/to/nonexistent-plugin'),
                'to be rejected with error satisfying',
                {code: ErrorCode.PluginImportError},
              );
            });
          });

          describe('when the plugin has a different name, but is the same object', function () {
            it('should reject', async function () {
              const plugin = {plugin: () => {}};
              await registry.registerPlugin('test-plugin', plugin);
              await expect(
                registry.registerPlugin('test-plugin-2', plugin),
                'to be rejected with error satisfying',
                {
                  code: ErrorCode.MachineError,
                  errors: [{code: ErrorCode.DuplicatePluginError}],
                },
              );
            });

            describe.skip('when loaded from disk', function () {
              beforeEach(async function () {
                await fs.promises.writeFile(
                  '/plugin.js',
                  'module.exports = {plugin: () => {}}',
                );
              });

              it('should reject', async function () {
                await registry.registerPlugin(
                  PluginMetadata.create({entryPoint: '/plugin.js', id: 'bar'}),
                  {plugin: () => {}},
                );
                await expect(
                  registry.registerPlugin(
                    PluginMetadata.create({
                      entryPoint: '/plugin.js',
                      id: 'bar',
                    }),
                    {plugin: () => {}},
                  ),
                  'to be rejected with error satisfying',
                  {code: ErrorCode.DuplicatePluginError},
                );
              });
            });
          });

          describe('when the plugin fails to initialize', function () {
            it('should reject', async function () {
              const err = new Error('Initialization error');
              const pluginObject = {
                plugin: () => {
                  throw err;
                },
              };
              await expect(
                registry.registerPlugin('test-plugin', pluginObject),
                'to be rejected with error satisfying',
                {
                  code: ErrorCode.MachineError,
                  errors: [{cause: err, code: ErrorCode.PluginInitError}],
                },
              );
            });
          });

          describe('when the registry is closed', function () {
            it('should reject', async function () {
              registry.close();
              await expect(
                registry.registerPlugin('test-plugin', {plugin: () => {}}),
                'to be rejected with error satisfying',
                {code: ErrorCode.DisallowedPluginError},
              );
            });
          });

          describe('when a plugin object has a name differing from its metadata', function () {
            it('should store the new name', async function () {
              const pluginObject = {name: 'new name', plugin: () => {}};
              await registry.registerPlugin('old name', pluginObject);

              expect(registry.plugins, 'to have an item satisfying', {
                id: 'new name',
              }).and('not to have an item satisfying', {id: 'old name'});
            });
          });

          describe('when a plugin object has a description differing from its metadata', function () {
            it('should store the new description', async function () {
              const oldMetadata = PluginMetadata.createTransient('foo', {
                description: 'old description',
                name: 'foo',
                version: '1.0.0',
              });

              const pluginObject = {description: 'something', plugin: () => {}};
              await registry.registerPlugin(oldMetadata, pluginObject);

              expect(registry.plugins, 'to have an item satisfying', {
                description: 'something',
              }).and('not to have an item satisfying', {
                description: 'old description',
              });
            });
          });
        });

        describe('clear()', function () {
          beforeEach(async function () {
            // Register a plugin to populate the maps
            await registry.registerPlugin(DEFAULT_TEST_PLUGIN_NAME, {
              plugin: () => {},
            });
            expect(registry.plugins, 'not to be empty');
            registry.close();
            registry.clear();
          });

          it('should set isClosed to false', function () {
            // Use a getter to access the private #isClosed property
            expect(registry.isClosed, 'to be false');
          });

          it('should clear out internal maps and re-open registration', function () {
            // best we can do given visibility
            expect(registry, 'to satisfy', {
              isClosed: false,
              plugins: expect.it('to be empty'),
            });
          });
        });

        describe('getExecutor()', function () {
          let registry: Reg.PluginRegistry;

          beforeEach(async function () {
            registry = PluginRegistry.create({
              fileManager,
            });
          });

          describe('when a Executor with the provided componentId exists', function () {
            beforeEach(async function () {
              await registry.registerPlugin(DEFAULT_TEST_PLUGIN_NAME, {
                plugin: ({defineExecutor}) => {
                  defineExecutor(sandbox.stub());
                },
              });
            });

            it('should return the Executor', async function () {
              const executor = await registry.getExecutor(
                `${DEFAULT_TEST_PLUGIN_NAME}/${DEFAULT_COMPONENT_ID}`,
              );
              expect(executor, 'to be a function');
            });
          });

          describe('when no Executor with the provided componentId exists', function () {
            it('should throw an UnknownComponentError', async function () {
              await expect(
                () => registry.getExecutor('nonexistent-component'),
                'to be rejected with error satisfying',
                {
                  code: ErrorCode.UnknownComponentError,
                  context: {
                    value: 'nonexistent-component',
                  },
                },
              );
            });
          });

          describe('when no componentId is provided', function () {
            describe('and a Executor with the default componentId exists', function () {
              beforeEach(async function () {
                await registry.registerPlugin(BLESSED_PLUGINS[0], {
                  plugin: ({defineExecutor}) => {
                    defineExecutor(sandbox.stub(), DEFAULT_EXECUTOR_ID);
                  },
                });
              });

              it('should return the Executor', async function () {
                const executor = await registry.getExecutor();
                expect(executor, 'to be a function');
              });
            });

            describe('and no Executor with the default componentId exists', function () {
              it('should reject with an UnknownComponentError', async function () {
                // ooh
                using registry = PluginRegistry.create({
                  fileManager,
                });

                await expect(
                  () => registry.getExecutor(),
                  'to be rejected with error satisfying',
                  {
                    code: ErrorCode.UnknownComponentError,
                    context: {
                      value: DEFAULT_COMPONENT_ID,
                    },
                  },
                );
              });
            });
          });
        });
      });
    });
  });
});
