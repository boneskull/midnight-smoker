import {PluginRegistry} from '#plugin/registry';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker [E2E]', function () {
  describe('PluginRegistry', function () {
    describe('loadPlugins()', function () {
      describe('when loading the @midnight-smoker/plugin-default plugin', function () {
        let registry: PluginRegistry;

        beforeEach(async function () {
          registry = PluginRegistry.create();
          await registry.registerPlugins(['@midnight-smoker/plugin-default']);
        });

        it('should load all components in the @midnight-smoker/plugin-default plugin', function () {
          expect(registry.toJSON(), 'to satisfy', {
            plugins: [
              {
                description: expect.it('to be a string'),
                entryPoint: expect.it('to be a string'),
                id: '@midnight-smoker/plugin-default',
                pkgManagerNames: expect
                  .it('to be an array')
                  .and('not to be empty'),
                reporterNames: expect
                  .it('to be an array')
                  .and('not to be empty'),
                ruleNames: expect.it('to be an array').and('not to be empty'),
                version: expect.it('to be a string'),
              },
            ],
          });
        });
      });
    });
  });
});
