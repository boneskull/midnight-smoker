import {FAILED, RuleSeverities} from '#constants';
import {RuleError} from '#error/rule-error';
import {type CheckResultFailed} from '#rule/check-result';
import {RuleIssue, type RuleIssueParams} from '#rule/rule-issue';
import {type StaticRuleContext} from '#rule/static-rule-context';
import {type StaticRule} from '#schema/static-rule';
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
        const exampleStaticRule: StaticRule = {
          defaultSeverity: RuleSeverities.Error,
          description: 'This is an example rule',
          name: 'example-rule',
          url: 'https://example.com/rules/example-rule',
        };
        const exampleStaticRuleContext: StaticRuleContext = {
          installPath: '/path/to/example-package',
          pkgJson: {
            name: 'example-package',
            version: '1.0.0',
          },
          pkgJsonPath: '/path/to/example-package/package.json',
          pkgManager: 'bebebebebee',
          pkgName: 'example-package',
          ruleId,
          severity: RuleSeverities.Error,
          workspace: {
            localPath: '/some/local/path',
            pkgJson: {
              name: 'example-package',
              version: '1.0.0',
            },
            pkgJsonPath: '/path/to/example-package/package.json',
            pkgName: 'example-package',
          },
        };
        let issue: RuleIssue;

        beforeEach(function () {
          params = {
            ctx: exampleStaticRuleContext,
            data: {foo: 'bar'},
            error: new RuleError(
              'Test error',
              {
                ...asResult(exampleStaticRuleContext),
                config: {opts: {}, severity: exampleStaticRuleContext.severity},
              },
              new Error('Test error'),
            ),
            message: 'Test message',
            rule: exampleStaticRule,
          };
          issue = new RuleIssue(params);
        });

        describe('constructor', function () {
          it('should correctly initialize properties', function () {
            expect(issue, 'to satisfy', {
              ctx: omit(params.ctx, 'pkgJson'),
              data: params.data,
              error: params.error,
              id: expect.it('to match', /^issue\..+$/),
              message: params.message,
              rule: params.rule,
            }).and('to be a', RuleIssue);
          });
        });

        describe('computed property', function () {
          describe('isError', function () {
            describe('when severity is Error', function () {
              beforeEach(function () {
                params = {
                  ctx: exampleStaticRuleContext,
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
                  message: 'Test message',
                  rule: exampleStaticRule,
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
                  ctx: {
                    ...exampleStaticRuleContext,
                    severity: RuleSeverities.Warn,
                  },
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
                  message: 'Test message',
                  rule: exampleStaticRule,
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
              const expected: CheckResultFailed = {
                ctx: asResult(params.ctx),
                data: params.data,
                error: params.error,
                filepath: issue.filepath,
                id: issue.id,
                isError: issue.isError,
                message: params.message,
                rule: params.rule,
                type: FAILED,
              };
              expect(issue.toJSON(), 'to equal', expected);
            });
          });
        });
      });
    });
  });
});
