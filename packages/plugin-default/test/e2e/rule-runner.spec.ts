import {registerPlugin, runRuleRunner} from '@midnight-smoker/test-util';
import {PluginRegistry, Rule, RuleRunner} from 'midnight-smoker/plugin';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import {SmokerRuleRunner, loadRuleRunner} from '../../src/rule-runner';

const expect = unexpected
  .clone()
  .use(unexpectedEventEmitter)
  .use(unexpectedSinon);

describe('@midnight-smoker/plugin-default', function () {
  describe('smokerRuleRunner', function () {
    const config: Rule.BaseRuleOptionsRecord = {
      'test-plugin/test-rule': {severity: 'error', opts: {}},
    };

    let sandbox: sinon.SinonSandbox;
    let registry: PluginRegistry;
    let runRulesManifest: RuleRunner.RunRulesManifest;
    let smokerRuleRunner: RuleRunner.RuleRunner;

    beforeEach(async function () {
      sandbox = createSandbox();

      registry = await registerPlugin({
        factory: (api) => {
          loadRuleRunner(api);

          api.defineRule({
            name: 'test-rule',
            description: 'a nice rule',
            check: sandbox.stub().resolves(),
          });
        },
      });

      runRulesManifest = [path.join(__dirname, '..', '..')];

      smokerRuleRunner = registry.getRuleRunner('test-plugin/default');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call runRule() for each rule and package', async function () {
      const spy = sandbox.spy(SmokerRuleRunner, 'runRule');
      await runRuleRunner(smokerRuleRunner, registry, runRulesManifest, {
        config,
      });
      expect(spy, 'was called once');
    });

    it('should run all rules', async function () {
      await expect(
        runRuleRunner(smokerRuleRunner, registry, runRulesManifest, {
          config,
        }),
        'to be fulfilled with value satisfying',
        {
          passed: expect.it('to have items satisfying', {
            rule: {
              name: 'test-rule',
              description: 'a nice rule',
            },
            context: {
              pkgJson: expect.it('to be an object'),
              pkgJsonPath: expect.it('to be a string'),
              pkgPath: expect.it('to be a string'),
              severity: expect.it('to be one of', ['error', 'warn', 'off']),
            },
          }),
        },
      );
    });

    describe('when rule is disabled', function () {
      const ruleConfig: Rule.BaseRuleOptionsRecord = {
        'test-plugin/test-rule': {severity: 'off', opts: {}},
      };
      it('should not run the disabled rule', async function () {
        await expect(
          runRuleRunner(smokerRuleRunner, registry, runRulesManifest, {
            config,
            filter: (rule) =>
              ruleConfig[rule.id].severity !== Rule.RuleSeverities.Off,
          }),
          'to be fulfilled with value satisfying',
          {
            passed: expect.it('to be empty'),
            issues: expect.it('to be empty'),
          },
        );
      });
    });

    describe('when rule has severity "warn"', function () {
      it('should return issues with a "warn" severity');
    });
    it('should notifiers events');
  });
});
