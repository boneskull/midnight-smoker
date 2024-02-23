import rewiremock from 'rewiremock/node';
import unexpected from 'unexpected';

import type * as Ctx from '#rule/context';
import {type SomeRule} from '#schema/rule';
import {type StaticRuleContext} from '#schema/rule-static';
import {createFsMocks} from '../../mocks/fs';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('rule', function () {
      let RuleContext: typeof Ctx.RuleContext;

      beforeEach(function () {
        const {mocks} = createFsMocks();
        RuleContext = rewiremock.proxy(
          () => require('../../../../src/component/rule/context'),
          mocks,
        ).RuleContext;
      });

      describe('RuleContext', function () {
        const rule = {
          id: 'example-rule',
          name: 'example-rule',
          description: 'This is an example rule',
          defaultSeverity: 'error',
          url: 'https://example.com/rules/example-rule',
        } as SomeRule;
        const staticCtx: StaticRuleContext = {
          pkgJson: {
            name: 'example-package',
            version: '1.0.0',
            // include other necessary package.json properties here
          },
          pkgJsonPath: '/path/to/example-package/package.json',
          installPath: '/path/to/example-package',
          severity: 'error',
        };

        describe('static method', function () {
          describe('create()', function () {
            let context: Readonly<Ctx.RuleContext>;

            beforeEach(function () {
              context = RuleContext.create(rule, staticCtx);
            });

            it('should return a frozen instance of RuleContext', function () {
              expect(context, 'to be a', RuleContext).and(
                'when passed as parameter to',
                Object.isFrozen,
                'to be true',
              );
            });

            it('should serialize a RuleContext as StaticRuleContext into a StaticRuleContext', function () {
              expect(
                staticCtx,
                'to equal',
                RuleContext.create(rule, context).toJSON(),
              );
            });

            it('should set the `addIssue()` property', function () {
              expect(context.addIssue, 'to be a', 'function');
            });
          });
        });

        describe('instance method', function () {
          let context: Readonly<Ctx.RuleContext>;

          beforeEach(function () {
            context = RuleContext.create(rule, staticCtx);
          });

          describe('addIssue()', function () {
            it('should add a RuleIssue to the issues array', function () {
              context.addIssue('foo', 'bar');
              expect(context.issues, 'to satisfy', [
                {message: 'foo', data: 'bar'},
              ]).and('to have length', 1);
            });

            it('should be bound to the RuleContext', function () {
              const addIssue = context.addIssue;
              addIssue('foo', 'bar');
              expect(context.issues, 'to satisfy', [
                {message: 'foo', data: 'bar'},
              ]).and('to have length', 1);
            });
          });

          describe('addIssueFromError()', function () {
            let error: Error;

            beforeEach(function () {
              error = new Error('Test error');
            });

            it('should add a RuleIssue to the issues array', function () {
              context.addIssueFromError(error);
              // "to equal" would be used here if we wanted to instantiate a RuleIssue.
              expect(context.issues, 'to satisfy', [
                {
                  message: 'Rule "example-rule" threw an exception',
                  error: {cause: error},
                  rule,
                  context: staticCtx,
                },
              ]).and('to have length', 1);
            });

            it('should be bound to the RuleContext', function () {
              const addIssueFromError = context.addIssueFromError;
              addIssueFromError(error);
              // "to equal" would be used here if we wanted to instantiate a RuleIssue.
              expect(context.issues, 'to satisfy', [
                {
                  message: 'Rule "example-rule" threw an exception',
                  error: {cause: error},
                  rule,
                  context: staticCtx,
                },
              ]).and('to have length', 1);
            });
          });

          describe('toJSON()', function () {
            it('should return a mutable copy of the StaticRuleContext', function () {
              expect(context.toJSON(), 'to equal', staticCtx)
                .and('not to be', staticCtx)
                .and(
                  'when passed as parameter to',
                  Object.isFrozen,
                  'to be false',
                );
            });
          });
          describe('finalize()', function () {
            describe('when issues were collected', function () {
              it('should return the collected issues', function () {
                context.addIssue('foo', 'bar');
                const issues = context.finalize();
                expect(issues, 'to satisfy', [
                  {
                    message: 'foo',
                    rule,
                    data: 'bar',
                    context: staticCtx,
                  },
                ]);
              });
            });

            describe('when no issues were collected', function () {
              it('should return undefined', function () {
                const issues = context.finalize();
                expect(issues, 'to be', undefined);
              });
            });
          });
        });

        describe('computed property', function () {
          let context: Readonly<Ctx.RuleContext>;

          beforeEach(function () {
            context = RuleContext.create(rule, staticCtx);
          });

          describe('pkgJson', function () {
            it('should return the pkgJson from the static context', function () {
              expect(context.pkgJson, 'to equal', staticCtx.pkgJson);
            });
          });

          describe('pkgJsonPath', function () {
            it('should return the pkgJsonPath from the static context', function () {
              expect(context.pkgJsonPath, 'to equal', staticCtx.pkgJsonPath);
            });
          });

          describe('installPath', function () {
            it('should return the installPath from the static context', function () {
              expect(context.installPath, 'to equal', staticCtx.installPath);
            });
          });

          describe('severity', function () {
            it('should return the severity from the static context', function () {
              expect(context.severity, 'to equal', staticCtx.severity);
            });
          });
        });
      });
    });
  });
});
