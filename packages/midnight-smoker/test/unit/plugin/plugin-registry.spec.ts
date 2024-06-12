import {DEFAULT_COMPONENT_ID} from '#constants';
import {ErrorCodes} from '#error/codes';
import {PLUGIN_DEFAULT_ID} from '#plugin/blessed';
import {PluginMetadata} from '#plugin/plugin-metadata';
import type * as Reg from '#plugin/plugin-registry';
import {memoize} from 'lodash';
import {type IFs} from 'memfs';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {ValidationError} from 'zod-validation-error';
import {createFsMocks, type FsMocks} from '../mocks';

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
      let PluginRegistry: typeof Reg.PluginRegistry;
      let fs: IFs;

      beforeEach(async function () {
        let mocks: FsMocks;
        ({mocks, fs} = createFsMocks());

        // TODO: replace with FileManager
        ({PluginRegistry} = rewiremock.proxy(
          () => require('#plugin/plugin-registry'),
          {
            ...mocks,
            '#util/loader-util': {
              /**
               * This thing loads and evals files via the in-memory filesystem.
               *
               * For this to do _anything_, you have to call
               * `fs.promises.writeFile(...)` first.
               */
              justImport: sandbox.stub().callsFake(
                memoize(async (moduleId: string) => {
                  const source = await fs.promises.readFile(moduleId, 'utf8');
                  // eslint-disable-next-line no-eval
                  return eval(`${source}`);
                }),
              ),
            },
          },
        ));
      });

      describe('static method', function () {
        describe('create()', function () {
          it('should return an instance of PluginRegistry', function () {
            const registry = PluginRegistry.create();
            expect(registry, 'to be a', PluginRegistry);
          });
        });

        describe('normalizePlugin()', function () {
          describe('when passed a PluginObject', function () {
            it('should return a shallow clone of the PluginObject', function () {
              const rawPlugin = {plugin: () => {}, name: 'foo'};
              expect(PluginRegistry.normalizePlugin(rawPlugin), 'to satisfy', {
                name: 'foo',
                plugin: expect.it('to be a function'),
              });
            });
          });

          describe('when passed a Babelized PluginObject', function () {
            it('should resolve the exports and return a shallow clone of the PluginObject', function () {
              const rawPlugin = {
                __esModule: true,
                default: {plugin: () => {}, name: 'foo'},
              };
              expect(PluginRegistry.normalizePlugin(rawPlugin), 'to satisfy', {
                name: 'foo',
                plugin: expect.it('to be a function'),
              });
            });
          });

          describe('when passed an object without a "plugin" property', function () {
            it('should throw an error', function () {
              expect(
                () => PluginRegistry.normalizePlugin({}),
                'to throw a',
                ValidationError,
              );
            });
          });
        });
      });

      describe('property', function () {
        let registry: Reg.PluginRegistry;

        beforeEach(function () {
          registry = PluginRegistry.create();
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
                plugin: () => {},
                description: 'some description',
                version: '0.0.0',
              });
            });

            it('should return a non-empty array of StaticPluginMetadata objects', function () {
              expect(registry.plugins, 'to satisfy', [
                {
                  id: 'test-plugin',
                  version: expect.it('to be a string'),
                  description: expect.it('to be a string'),
                },
              ]);
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
            expect(registry.plugins, 'to have length', 1);
          });

          describe('when a plugin with the same name but different value is already registered', function () {
            it('should reject', async function () {
              const pluginA = {plugin: () => {}};
              const pluginB = {plugin: () => {}};
              await registry.registerPlugin('test-plugin', pluginA);
              await expect(
                registry.registerPlugin('test-plugin', pluginB),
                'to be rejected with error satisfying',
                {code: ErrorCodes.PluginConflictError},
              );
            });
          });

          describe('when the plugin cannot be found', function () {
            it('should reject', async function () {
              await expect(
                registry.registerPlugin('/path/to/nonexistent-plugin'),
                'to be rejected with error satisfying',
                {code: ErrorCodes.PluginImportError},
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
                {code: ErrorCodes.DuplicatePluginError},
              );
            });

            describe('when loaded from disk', function () {
              beforeEach(async function () {
                await fs.promises.writeFile(
                  '/plugin.js',
                  'module.exports = {plugin: () => {}}',
                );
              });

              it('should reject', async function () {
                await registry.registerPlugin('/plugin.js', 'bar');
                await expect(
                  registry.registerPlugin('/plugin.js', 'foo'),
                  'to be rejected with error satisfying',
                  {code: ErrorCodes.DuplicatePluginError},
                );
              });
            });
          });

          describe('when the plugin fails to initialize (PluginFactory errors out)', function () {
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
                {code: ErrorCodes.PluginInitError, cause: err},
              );
            });
          });

          describe('when the registry is closed', function () {
            it('should reject', async function () {
              registry.close();
              await expect(
                registry.registerPlugin('test-plugin', {plugin: () => {}}),
                'to be rejected with error satisfying',
                {code: ErrorCodes.DisallowedPluginError},
              );
            });
          });

          describe('when a plugin object has a name differing from its metadata', function () {
            it('should store the new name', async function () {
              const pluginObject = {plugin: () => {}, name: 'new name'};
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
              });

              const pluginObject = {plugin: () => {}, description: 'something'};
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
              plugins: expect.it('to be empty'),
              isClosed: false,
            });
          });
        });

        describe('getExecutor()', function () {
          let registry: Reg.PluginRegistry;

          beforeEach(async function () {
            registry = PluginRegistry.create();
          });

          describe('when a Executor with the provided componentId exists', function () {
            beforeEach(async function () {
              await registry.registerPlugin(DEFAULT_TEST_PLUGIN_NAME, {
                plugin: ({defineExecutor}) => {
                  defineExecutor(sandbox.stub());
                },
              });
            });

            it('should return the Executor', function () {
              const executor = registry.getExecutor(
                `${DEFAULT_TEST_PLUGIN_NAME}/${DEFAULT_COMPONENT_ID}`,
              );
              expect(executor, 'to be a function');
            });
          });

          describe('when no Executor with the provided componentId exists', function () {
            it('should throw an InvalidComponentError', function () {
              expect(
                () => registry.getExecutor('nonexistent-component'),
                'to throw',
                {
                  code: ErrorCodes.InvalidComponentError,
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
                await registry.registerPlugin(PLUGIN_DEFAULT_ID, {
                  plugin: ({defineExecutor}) => {
                    defineExecutor(sandbox.stub());
                  },
                });
              });

              it('should return the Executor', function () {
                const executor = registry.getExecutor();
                expect(executor, 'to be a function');
              });
            });

            describe('and no Executor with the default componentId exists', function () {
              it('should throw an InvalidComponentError', function () {
                expect(() => registry.getExecutor(), 'to throw', {
                  code: ErrorCodes.InvalidComponentError,
                  context: {
                    value: DEFAULT_COMPONENT_ID,
                  },
                });
              });
            });
          });
        });
      });
    });
  });
});
