import {registerPlugin} from '@midnight-smoker/test-util';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {ZodError} from 'zod';
import {PluginMetadata} from '../../../src/plugin/metadata';
import type * as PR from '../../../src/plugin/registry';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('PluginRegistry', function () {
    let PluginRegistry: typeof PR.PluginRegistry;

    beforeEach(async function () {
      ({PluginRegistry} = rewiremock.proxy(() =>
        require('../../../src/plugin/registry'),
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
            const rawPlugin = {plugin: () => {}};
            expect(
              PluginRegistry.normalizePlugin(rawPlugin),
              'to equal',
              rawPlugin,
            );
          });
        });

        describe('when passed a Babelized PluginObject', function () {
          it('should return a shallow clone of the PluginObject', function () {
            const rawPlugin = {default: {plugin: () => {}}};
            expect(
              PluginRegistry.normalizePlugin(rawPlugin),
              'to equal',
              rawPlugin.default,
            );
          });
        });

        describe('when passed an object without a "plugin" property', function () {
          it('should throw an error', function () {
            expect(
              () => PluginRegistry.normalizePlugin({}),
              'to throw a',
              ZodError,
            );
          });
        });
      });
    });

    describe('property', function () {
      let registry: PR.PluginRegistry;

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
            await registerPlugin({registry});
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
      let registry: PR.PluginRegistry;

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
              {code: 'ESMOKER_PLUGINCONFLICT'},
            );
          });
        });

        describe('when the plugin cannot be found', function () {
          it('should reject', async function () {
            await expect(
              registry.registerPlugin('/path/to/nonexistent-plugin'),
              'to be rejected with error satisfying',
              {code: 'ESMOKER_PLUGINIMPORT'},
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
              {code: 'ESMOKER_DUPLICATEPLUGIN'},
            );
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
              {code: 'ESMOKER_PLUGININIT', cause: err},
            );
          });
        });

        describe('when the registry is closed', function () {
          it('should reject', async function () {
            registry.close();
            await expect(
              registry.registerPlugin('test-plugin', {plugin: () => {}}),
              'to be rejected with error satisfying',
              {code: 'ESMOKER_DISALLOWEDPLUGIN'},
            );
          });
        });

        describe('when a plugin object has a name differing from its metadata', function () {
          it('should store the new name', async function () {
            const pluginObject = {plugin: () => {}, name: 'new name'};
            await expect(
              registry.registerPlugin('old name', pluginObject),
              'to be fulfilled with value satisfying',
              {id: 'new name'},
            );

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

            await expect(
              registry.registerPlugin(oldMetadata, pluginObject),
              'to be fulfilled with value satisfying',
              {id: 'foo', description: 'something'},
            );

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
          await registerPlugin({registry});
          expect(registry.plugins, 'not to be empty');
          registry.close();
          registry.clear();
        });

        it('should set isClosed to false', function () {
          // Use a getter to access the private #isClosed property
          expect(registry.isClosed, 'to be false');
        });

        it('should clear out internal maps', function () {
          // best we can do given visibility
          expect(registry, 'to satisfy', {
            plugins: expect.it('to be empty'),
            reporters: expect.it('to be empty'),
          });
        });
      });

      describe('loadPlugins()', function () {
        describe('when loading the @midnight-smoker/plugin-default plugin', function () {
          beforeEach(async function () {
            await registry.loadPlugins(['@midnight-smoker/plugin-default']);
          });

          it('should load all components in the @midnight-smoker/plugin-default plugin', function () {
            expect(registry.toJSON(), 'to exhaustively satisfy', {
              plugins: [
                {
                  id: '@midnight-smoker/plugin-default',
                  version: expect.it('to be a string'),
                  description: expect.it('to be a string'),
                  entryPoint: expect.it('to be a string'),
                },
              ],
              scriptRunners: ['default'],
              ruleRunners: ['default'],
              executors: ['default'],
              pkgManagerModules: ['Npm7', 'Npm9', 'YarnClassic', 'YarnBerry'],
            });
          });
        });
      });
    });
  });
});
