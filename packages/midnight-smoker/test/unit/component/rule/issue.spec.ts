import {RuleSeverities} from '#constants';
import {RuleError} from '#error/rule-error';
import type * as I from '#rule/issue';
import * as IS from '#schema/rule-result';
import type {StaticRuleContext, StaticRuleDef} from '#schema/rule-static';
import rewiremock from 'rewiremock/node';
import unexpected from 'unexpected';
import {createFsMocks} from '../../mocks/fs';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('rule', function () {
      let RuleIssue: typeof I.RuleIssue;

      beforeEach(function () {
        const {mocks} = createFsMocks();
        ({RuleIssue} = rewiremock.proxy(
          () => require('../../../../src/component/rule/issue'),
          mocks,
        ));
      });
      describe('RuleIssue', function () {
        let params: I.RuleIssueParams<StaticRuleContext, StaticRuleDef>;
        const exampleStaticRule: StaticRuleDef = {
          name: 'example-rule',
          description: 'This is an example rule',
          defaultSeverity: 'error',
          url: 'https://example.com/rules/example-rule',
        };
        const exampleStaticRuleContext: StaticRuleContext = {
          pkgName: 'example-package',
          pkgJson: {
            name: 'example-package',
            version: '1.0.0',
          },
          pkgJsonPath: '/path/to/example-package/package.json',
          installPath: '/path/to/example-package',
          localPath: '/path/to/example-package',
          severity: 'error',
          ruleName: exampleStaticRule.name,
          pkgManager: 'bebebebebee',
        };
        let issue: I.RuleIssue;

        beforeEach(function () {
          params = {
            rule: exampleStaticRule,
            // @ts-expect-error FIX
            context: exampleStaticRuleContext,
            message: 'Test message',
            data: {foo: 'bar'},
            error: new RuleError(
              'Test error',
              exampleStaticRuleContext,
              'example-rule',
              new Error('Test error'),
            ),
          };
          issue = new RuleIssue(params);
        });

        describe('constructor', function () {
          it('should correctly initialize properties', function () {
            expect(issue, 'to satisfy', {
              rule: params.rule,
              // @ts-expect-error FIX
              context: params.context,
              message: params.message,
              data: params.data,
              error: params.error,
              id: expect.it('to match', /^issue-\d+$/),
            }).and('to be a', RuleIssue);
          });
        });

        describe('computed property', function () {
          describe('failed', function () {
            describe('when severity is Error', function () {
              it('should return true', function () {
                // @ts-expect-error FIX
                params.context.severity = RuleSeverities.Error;
                expect(issue.failed, 'to be true');
              });
            });

            describe('when severity is Warn', function () {
              it('should return false', function () {
                // @ts-expect-error FIX
                params.context.severity = RuleSeverities.Warn;
                expect(issue.failed, 'to be false');
              });
            });
          });

          describe('severity', function () {
            it('should return the severity from the context', function () {
              // @ts-expect-error FIX
              expect(issue.severity, 'to be', params.context.severity);
            });
          });
        });

        describe('static method', function () {
          describe('create()', function () {
            it('should return a frozen instance of RuleIssue', function () {
              expect(RuleIssue.create(params), 'to be a', RuleIssue).and(
                'when passed as parameter to',
                Object.isFrozen,
                'to be true',
              );
            });
          });

          describe('compare()', function () {
            it('should correctly compare two issues by id', function () {
              const issue1 = new RuleIssue(params);
              const issue2 = new RuleIssue(params);
              expect([issue2, issue1].sort(RuleIssue.compare), 'to equal', [
                issue1,
                issue2,
              ]);
            });
          });
        });

        describe('instance method', function () {
          describe('toJSON()', function () {
            it('should return a StaticRuleIssue', function () {
              const expected: IS.RuleResultFailed = {
                rule: params.rule,
                // @ts-expect-error FIX
                context: params.context,
                message: params.message,
                data: params.data,
                error: params.error,
                id: issue.id,
                failed: issue.failed,
                severity: issue.severity,
                pkgManager: issue.pkgManager,
                filepath: issue.filepath,
              };
              expect(issue.toJSON(), 'to equal', expected).and(
                'when passed as parameter to',
                // @ts-expect-error FIX
                IS.RuleResultFailedSchema.parse,
                'to equal',
                expected,
              );
            });
          });
        });
      });
    });
  });
});
