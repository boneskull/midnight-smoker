import {OK} from '#constants';
import {RuleContext} from '#rule/rule-context';
import {type StaticRuleContext} from '#rule/static-rule-context';
import {type SomeRule} from '#schema/rule';
import stringify from 'json-stable-stringify';
import {omit} from 'lodash';
import unexpected from 'unexpected';
import {fileURLToPath} from 'url';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('rule', function () {
      describe('RuleContext', function () {
        const ruleId = 'example-rule';
        const rule = {
          defaultSeverity: 'error',
          description: 'This is an example rule',
          name: 'example-rule',
          url: 'https://example.com/rules/example-rule',
        } as SomeRule;
        const staticCtx: StaticRuleContext = {
          installPath: '/path/to/example-package',
          pkgJson: {
            name: 'example-package',
            version: '1.0.0',
            // include other necessary package.json properties here
          },
          pkgJsonPath: '/path/to/example-package/package.json',
          pkgManager: 'smthing',
          pkgName: 'example-package',
          rawPkgJson: '{}',
          ruleId,
          severity: 'error',
          workspace: {
            localPath: '/some/local/path',
            pkgJson: {
              name: 'example-package',
              version: '1.0.0',
            },
            pkgJsonPath: '/path/to/example-package/package.json',
            pkgName: 'example-package',
            rawPkgJson: stringify({
              name: 'example-package',
              version: '1.0.0',
            }),
          },
        };

        describe('static method', function () {
          describe('create()', function () {
            let context: Readonly<RuleContext>;

            beforeEach(function () {
              context = RuleContext.create(rule, staticCtx, ruleId);
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
                RuleContext.create(rule, context, ruleId).toJSON(),
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
            context = RuleContext.create(rule, staticCtx, ruleId);
          });

          describe('addIssue()', function () {
            it('should add a RuleIssue to the issues array', function () {
              context.addIssue('foo', {data: 'bar'});
              expect(context.issues, 'to satisfy', [
                {data: 'bar', message: 'foo'},
              ]).and('to have length', 1);
            });

            it('should be bound to the RuleContext', function () {
              const addIssue = context.addIssue;
              addIssue('foo', {data: 'bar'});
              expect(context.issues, 'to satisfy', [
                {data: 'bar', message: 'foo'},
              ]).and('to have length', 1);
            });

            it('should allow a filepath as a string', function () {
              context.addIssue('foo', {data: 'bar', filepath: '/path/to/file'});
              expect(context.issues, 'to satisfy', [
                {data: 'bar', filepath: '/path/to/file', message: 'foo'},
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
                  data: 'bar',
                  filepath: fileURLToPath(filepath),
                  message: 'foo',
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
                      ctx: omit(staticCtx, 'pkgJson'),
                      data: 'bar',
                      message: 'foo',
                      rule,
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
            context = RuleContext.create(rule, staticCtx, ruleId);
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

          describe('ruleName', function () {
            it('should return the rule name from the static context', function () {
              expect(context.ruleName, 'to equal', rule.name);
            });
          });

          describe('workspace', function () {
            it('should return the workspace from the static context', function () {
              expect(context.workspace, 'to equal', staticCtx.workspace);
            });
          });

          describe('localPath', function () {
            it('should return the localPath from the workspace', function () {
              expect(
                context.localPath,
                'to equal',
                staticCtx.workspace.localPath,
              );
            });
          });

          describe('pkgName', function () {
            it('should return the pkgName from the static context', function () {
              expect(context.pkgName, 'to equal', staticCtx.pkgName);
            });
          });

          describe('pkgManager', function () {
            it('should return the pkgManager from the static context', function () {
              expect(context.pkgManager, 'to equal', staticCtx.pkgManager);
            });
          });
        });
      });
    });
  });
});
