import {registerRule} from '@midnight-smoker/test-util';
import unexpected from 'unexpected';
import {SomeRule} from '../../../../src/component';
import {BLESSED_PLUGINS} from '../../../../src/plugin/blessed';
import {PluginRegistry} from '../../../../src/plugin/registry';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('rule', function () {
    describe('Rule', function () {
      describe('property', function () {
        describe('id', function () {
          describe('when the plugin is blessed', function () {
            let rule: SomeRule;
            beforeEach(async function () {
              const registry = PluginRegistry.create();
              rule = await registerRule(
                {
                  name: 'foo',
                },
                registry,
                BLESSED_PLUGINS[0],
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
                {
                  name: 'foo',
                },
                registry,
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
