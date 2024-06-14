import {OK} from '#constants';
import {RuleContext} from '#rule/rule-context';
import {type StaticRuleContext} from '#schema/rule-static';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {omit} from 'lodash';
import unexpected from 'unexpected';
import {fileURLToPath} from 'url';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('rule', function () {
      describe('RuleContext', function () {
        const ruleId = 'example-rule';
        const ruleDef = {
          name: 'example-rule',
          description: 'This is an example rule',
          defaultSeverity: 'error',
          url: 'https://example.com/rules/example-rule',
        } as SomeRuleDef;
        const staticCtx: StaticRuleContext = {
          pkgName: 'example-package',
          pkgJson: {
            name: 'example-package',
            version: '1.0.0',
            // include other necessary package.json properties here
          },
          pkgJsonPath: '/path/to/example-package/package.json',
          installPath: '/path/to/example-package',
          localPath: '/path/to/example-package',
          pkgManager: 'smthing',
          severity: 'error',
          ruleId,
        };

        describe('static method', function () {
          describe('create()', function () {
            let context: Readonly<RuleContext>;

            beforeEach(function () {
              context = RuleContext.create(ruleDef, staticCtx, ruleId);
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
                RuleContext.create(ruleDef, context, ruleId).toJSON(),
              );
            });

            it('should set the `addIssue()` property', function () {
              expect(context.addIssue, 'to be a', 'function');
            });
          });
        });

        describe('instance method', function () {
          let context: Readonly<RuleContext>;

          beforeEach(function () {
            context = RuleContext.create(ruleDef, staticCtx, ruleId);
          });

          describe('addIssue()', function () {
            it('should add a RuleIssue to the issues array', function () {
              context.addIssue('foo', {data: 'bar'});
              expect(context.issues, 'to satisfy', [
                {message: 'foo', data: 'bar'},
              ]).and('to have length', 1);
            });

            it('should be bound to the RuleContext', function () {
              const addIssue = context.addIssue;
              addIssue('foo', {data: 'bar'});
              expect(context.issues, 'to satisfy', [
                {message: 'foo', data: 'bar'},
              ]).and('to have length', 1);
            });

            it('should allow a filepath as a string', function () {
              context.addIssue('foo', {data: 'bar', filepath: '/path/to/file'});
              expect(context.issues, 'to satisfy', [
                {message: 'foo', data: 'bar', filepath: '/path/to/file'},
              ]).and('to have length', 1);
            });

            it('should allow a filepath as a URL (and convert it to a path)', function () {
              const filepath = new URL('file:///some-file');
              context.addIssue('foo', {
                data: 'bar',
                filepath,
              });
              expect(context.issues, 'to satisfy', [
                {
                  message: 'foo',
                  data: 'bar',
                  filepath: fileURLToPath(filepath),
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
                context.addIssue('foo', {data: 'bar'});
                const issues = context.finalize();
                expect(issues, 'to satisfy', {
                  result: [
                    {
                      message: 'foo',
                      rule: ruleDef,
                      data: 'bar',
                      ctx: omit(staticCtx, 'pkgJson'),
                    },
                  ],
                });
              });
            });

            describe('when no issues were collected', function () {
              it('should return OK', function () {
                const issues = context.finalize();
                expect(issues, 'to satisfy', {type: OK});
              });
            });
          });
        });

        describe('computed property', function () {
          let context: Readonly<RuleContext>;

          beforeEach(function () {
            context = RuleContext.create(ruleDef, staticCtx, ruleId);
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
