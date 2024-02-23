import {PluginRegistry} from '#plugin/plugin-registry';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker [E2E]', function () {
  describe('PluginRegistry', function () {
    describe('loadPlugins()', function () {
      describe('when loading the @midnight-smoker/plugin-default plugin', function () {
        let registry: PluginRegistry;
        beforeEach(async function () {
          registry = await PluginRegistry.create().loadPlugins([
            '@midnight-smoker/plugin-default',
          ]);
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
            executors: ['default', 'system'],
            pkgManagerDefs: ['Npm7', 'Npm9', 'YarnClassic', 'YarnBerry'],
            reporterDefs: ['console', 'json', 'exit'],
          });
        });
      });
    });
  });
});
