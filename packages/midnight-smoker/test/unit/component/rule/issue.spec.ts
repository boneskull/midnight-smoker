import unexpected from 'unexpected';
import {RuleError} from '../../../../src/component/rule-runner/rule-error';
import type {
  RuleIssueParams,
  StaticRuleIssue,
} from '../../../../src/component/rule/issue';
import {
  RuleIssue,
  zStaticRuleIssue,
} from '../../../../src/component/rule/issue';
import {RuleSeverities} from '../../../../src/component/rule/severity';
import type {
  StaticRule,
  StaticRuleContext,
} from '../../../../src/component/rule/static';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('rule', function () {
      describe('RuleIssue', function () {
        let params: RuleIssueParams<StaticRuleContext, StaticRule>;
        const exampleStaticRule: StaticRule = {
          name: 'example-rule',
          description: 'This is an example rule',
          defaultSeverity: 'error',
          url: 'https://example.com/rules/example-rule',
        };
        const exampleStaticRuleContext: StaticRuleContext = {
          pkgJson: {
            name: 'example-package',
            version: '1.0.0',
          },
          pkgJsonPath: '/path/to/example-package/package.json',
          installPath: '/path/to/example-package',
          severity: 'error',
        };
        let issue: RuleIssue;

        beforeEach(function () {
          params = {
            rule: exampleStaticRule,
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
                params.context.severity = RuleSeverities.Error;
                expect(issue.failed, 'to be true');
              });
            });

            describe('when severity is Warn', function () {
              it('should return false', function () {
                params.context.severity = RuleSeverities.Warn;
                expect(issue.failed, 'to be false');
              });
            });
          });

          describe('severity', function () {
            it('should return the severity from the context', function () {
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
              const expected: StaticRuleIssue = {
                rule: params.rule,
                context: params.context,
                message: params.message,
                data: params.data,
                error: params.error,
                id: issue.id,
                failed: issue.failed,
                severity: issue.severity,
              };
              expect(issue.toJSON(), 'to equal', expected).and(
                'when passed as parameter to',
                zStaticRuleIssue.parse,
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
