import {FAILED, RuleSeverities} from '#constants';
import {RuleError} from '#error/rule-error';
import {type Issue} from '#rule/issue';
import {JSONBlamer} from '#rule/json-blamer';
import {type RuleContext} from '#rule/rule-context';
import {RuleIssue, type RuleIssueParams} from '#rule/rule-issue';
import {type StaticRuleContext} from '#rule/static-rule-context';
import {type StaticRule} from '#schema/lint/static-rule';
import {asResult} from '#util/result';
import stringify from 'json-stable-stringify';
import {omit} from 'remeda';
import sinon from 'sinon';
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
          pkgJsonSource: '{}',
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
            pkgJsonSource: stringify({
              name: 'example-package',
              version: '1.0.0',
            }),
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
              ctx: omit(params.ctx, ['pkgJson']),
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
              const expected: Issue = {
                ctx: params.ctx,
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

          describe('getSourceContext()', function () {
            let sandbox: sinon.SinonSandbox;

            beforeEach(function () {
              sandbox = sinon.createSandbox();
            });

            afterEach(function () {
              sandbox.restore();
            });

            describe('when filepath is a JSON file and jsonField is provided', function () {
              it('should return the context from the JSONBlamer', function () {
                const result: Issue = {
                  ctx: {pkgJsonSource: '{}'} as RuleContext,
                  filepath: '/path/to/package.json',
                  id: '12345',
                  isError: false,
                  jsonField: 'name',
                  message: 'Test message',
                  rule: {
                    defaultSeverity: 'error',
                    description: 'Example rule',
                    name: 'example-rule',
                  },
                  type: FAILED,
                };

                const blamerStub = sandbox
                  .stub(JSONBlamer.prototype, 'find')
                  .returns({column: 1, line: 1} as any);
                sandbox
                  .stub(JSONBlamer.prototype, 'getContext')
                  .returns('Context with line numbers');

                const context = RuleIssue.getSourceContext(result);

                expect(context, 'to equal', 'Context with line numbers\n');
                expect(blamerStub.calledOnceWith('name'), 'to be true');
              });
            });

            describe('when filepath is not a JSON file or jsonField is not provided', function () {
              it('should return an empty string', function () {
                const result: Issue = {
                  ctx: {pkgJsonSource: '{}'} as RuleContext,
                  filepath: '/path/to/package.txt',
                  id: '12345',
                  isError: false,
                  jsonField: 'name',
                  message: 'Test message',
                  rule: {
                    defaultSeverity: 'error',
                    description: 'Example rule',
                    name: 'example-rule',
                  },
                  type: FAILED,
                };

                const context = RuleIssue.getSourceContext(result);

                expect(context, 'to equal', '');
              });

              it('should return an empty string if jsonField is not provided', function () {
                const result: Issue = {
                  ctx: {pkgJsonSource: '{}'} as RuleContext,
                  filepath: '/path/to/package.json',
                  id: '12345',
                  isError: false,
                  jsonField: undefined,
                  message: 'Test message',
                  rule: {
                    defaultSeverity: 'error',
                    description: 'Example rule',
                    name: 'example-rule',
                  },
                  type: FAILED,
                };

                const context = RuleIssue.getSourceContext(result);

                expect(context, 'to equal', '');
              });
            });
          });
        });
      });
    });
  });
});
