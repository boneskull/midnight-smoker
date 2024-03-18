import {PLUGIN_DEFAULT_ID} from '#plugin/blessed';
import {PluginRegistry} from '#plugin/plugin-registry';
import {type SomeRule} from '#schema/rule';
import {registerRule} from '@midnight-smoker/test-util';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker [E2E]', function () {
  describe('component', function () {
    describe('Rule', function () {
      describe('property', function () {
        describe('id', function () {
          describe('when the plugin is blessed', function () {
            let rule: SomeRule;
            beforeEach(async function () {
              const registry = PluginRegistry.create();
              rule = await registerRule(
                registry,
                {
                  name: 'foo',
                },
                PLUGIN_DEFAULT_ID,
              );
            });

            it('should return the rule name verbatim', function () {
              expect((rule as any).id, 'to equal', 'foo');
            });
          });

          describe('when the plugin is a third-party plugin', function () {
            let rule: SomeRule;
            beforeEach(async function () {
              const registry = PluginRegistry.create();
              rule = await registerRule(
                registry,
                {
                  name: 'foo',
                },
                'my-plugin',
              );
            });

            it('should return the scoped rule name', function () {
              expect((rule as any).id, 'to equal', 'my-plugin/foo');
            });
          });
        });
      });
    });
  });
});
