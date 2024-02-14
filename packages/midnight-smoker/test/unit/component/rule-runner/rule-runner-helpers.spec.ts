import {type Component} from '#component';
import {PluginRegistry} from '#plugin';
import {type StaticRuleContext} from '#rule';
import type * as RR from '#rule-runner';
import {RuleContext} from '#rule/context';
import {type SomeRule} from '#schema/rule';
import {
  type BaseNormalizedRuleOptions,
  type BaseNormalizedRuleOptionsRecord,
} from '#schema/rule-options';
import {registerRule} from '@midnight-smoker/test-util';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createFsMocks, type FsMocks} from '../../mocks';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('rule runner', function () {
      describe('rule runner helpers', function () {
        let sandbox: sinon.SinonSandbox;
        let createRuleContext: typeof RR.createRuleContext;
        let getConfigForRule: typeof RR.getConfigForRule;
        let createRuleOkResult: typeof RR.createRuleOkResult;
        let fs: FsMocks['fs'];
        let rule: Component<SomeRule>;
        let installPath: string;
        let ruleConfig: BaseNormalizedRuleOptions;
        let registry: PluginRegistry;

        beforeEach(async function () {
          sandbox = createSandbox();
          let mocks: FsMocks;
          ({mocks, fs} = createFsMocks());

          ({createRuleContext, createRuleOkResult, getConfigForRule} =
            rewiremock.proxy(
              () =>
                require('../../../../src/component/rule-runner/rule-runner-helpers'),
              {
                ...mocks,
                'read-pkg-up': sandbox.stub().callsFake(async ({cwd = '/'}) => {
                  const filepath = path.join(cwd, 'package.json');
                  return fs.promises
                    .readFile(filepath, 'utf8')
                    .then((data) => ({
                      path: filepath,
                      packageJson: JSON.parse(`${data}`),
                    }));
                }),
              },
            ));
          registry = PluginRegistry.create();
          rule = await registerRule(registry, {});
          installPath = '/';
          ruleConfig = {severity: 'error', opts: {}};

          // needs a package.json
          await fs.promises.writeFile(path.normalize('/package.json'), '{}');
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('createRuleContext()', function () {
          it('should return a RuleContext', async function () {
            await expect(
              createRuleContext(rule, installPath, ruleConfig),
              'to be fulfilled with value satisfying',
              {
                pkgJson: {},
                pkgJsonPath: '/package.json',
                installPath: '/',
                severity: 'error',
                staticCtx: {
                  pkgJson: {},
                  pkgJsonPath: '/package.json',
                  installPath: '/',
                  severity: 'error',
                },
                issues: [],
              },
            );
          });

          it('should pass a StaticRuleContext to RuleContext.create', async function () {
            const src: StaticRuleContext = {
              pkgJson: {},
              pkgJsonPath: '/package.json',
              installPath: '/',
              severity: 'error',
            };
            sandbox.spy(RuleContext, 'create');
            await createRuleContext(rule, installPath, ruleConfig);
            expect(RuleContext.create, 'was called once').and(
              'to have a call satisfying',
              [rule, src],
            );
          });
        });

        describe('createRuleOkResult()', function () {
          let context: Readonly<RuleContext>;

          beforeEach(async function () {
            context = await createRuleContext(rule, installPath, ruleConfig);
          });

          it('should return a RuleOk object containing static representations of the rule & context', function () {
            const result = createRuleOkResult(rule, context);
            expect(result, 'to satisfy', {
              rule: rule.toJSON(),
              context: context.toJSON(),
            });
          });
        });

        describe('getConfigForRule()', function () {
          let config: BaseNormalizedRuleOptionsRecord;

          beforeEach(function () {
            config = {
              [rule.id]: {severity: 'error', opts: {}},
            };
          });

          it('should return the frozen configuration for the rule', function () {
            expect(
              getConfigForRule(rule, config),
              'to equal',
              config[rule.id],
            ).and('when passed as parameter to', Object.isFrozen, 'to be true');
          });
        });
      });
    });
  });
});
