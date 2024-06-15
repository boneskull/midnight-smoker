import {RuleSeverities} from '#constants';
import {RuleError} from '#error/rule-error';
import {RuleIssue, type RuleIssueParams} from '#rule/rule-issue';
import {type CheckFailed} from '#schema/check-result';
import type {StaticRuleContext, StaticRuleDef} from '#schema/rule-static';
import {asResult} from '#util/result';
import {omit} from 'lodash';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('rule', function () {
      describe('RuleIssue', function () {
        let params: RuleIssueParams;
        const ruleId = 'example-rule';
        const exampleStaticRule: StaticRuleDef = {
          name: 'example-rule',
          description: 'This is an example rule',
          defaultSeverity: RuleSeverities.Error,
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
          severity: RuleSeverities.Error,
          pkgManager: 'bebebebebee',
          ruleId,
        };
        let issue: RuleIssue;

        beforeEach(function () {
          params = {
            rule: exampleStaticRule,
            ctx: exampleStaticRuleContext,
            message: 'Test message',
            data: {foo: 'bar'},
            error: new RuleError(
              'Test error',
              {
                ...asResult(exampleStaticRuleContext),
                config: {opts: {}, severity: exampleStaticRuleContext.severity},
              },
              new Error('Test error'),
            ),
          };
          issue = new RuleIssue(params);
        });

        describe('constructor', function () {
          it('should correctly initialize properties', function () {
            expect(issue, 'to satisfy', {
              rule: params.rule,
              ctx: omit(params.ctx, 'pkgJson'),
              message: params.message,
              data: params.data,
              error: params.error,
              id: expect.it('to match', /^issue\..+$/),
            }).and('to be a', RuleIssue);
          });
        });

        describe('computed property', function () {
          describe('isError', function () {
            describe('when severity is Error', function () {
              beforeEach(function () {
                params = {
                  rule: exampleStaticRule,
                  ctx: exampleStaticRuleContext,
                  message: 'Test message',
                  data: {foo: 'bar'},
                  error: new RuleError(
                    'Test error',
                    {
                      ...asResult(exampleStaticRuleContext),
                      config: {
                        opts: {},
                        severity: exampleStaticRuleContext.severity,
                      },
                    },
                    new Error('Test error'),
                  ),
                };
                issue = new RuleIssue(params);
              });
              it('should return true', function () {
                expect(issue.isError, 'to be true');
              });
            });

            describe('when severity is Warn', function () {
              beforeEach(function () {
                params = {
                  rule: exampleStaticRule,
                  ctx: {
                    ...exampleStaticRuleContext,
                    severity: RuleSeverities.Warn,
                  },
                  message: 'Test message',
                  data: {foo: 'bar'},
                  error: new RuleError(
                    'Test error',
                    {
                      ...asResult(exampleStaticRuleContext),
                      config: {
                        opts: {},
                        severity: exampleStaticRuleContext.severity,
                      },
                    },
                    new Error('Test error'),
                  ),
                };
                issue = new RuleIssue(params);
              });
              it('should return false', function () {
                expect(issue.isError, 'to be false');
              });
            });
          });

          describe('severity', function () {
            it('should return the severity from the context', function () {
              expect(issue.severity, 'to be', params.ctx.severity);
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
        });

        describe('instance method', function () {
          describe('toJSON()', function () {
            it('should return a StaticRuleIssue', function () {
              const expected: CheckFailed = {
                rule: params.rule,
                ctx: asResult(params.ctx),
                message: params.message,
                data: params.data,
                error: params.error,
                id: issue.id,
                isError: issue.isError,
                filepath: issue.filepath,
                type: 'FAILED',
              };
              expect(issue.toJSON(), 'to equal', expected);
            });
          });
        });
      });
    });
  });
});
