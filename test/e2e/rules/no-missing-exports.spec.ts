import unexpected from 'unexpected';
import type {PackedPackage} from '../../../src';
import {RuleSeverities, type RawRuleConfig} from '../../../src/rules';
import noMissingExports from '../../../src/rules/builtin/no-missing-exports';
import {setupRuleTest, applyRules} from './rule-helpers';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('rules', function () {
    let ruleConfig: RawRuleConfig;
    let pkg: PackedPackage;

    describe('no-missing-exports', function () {
      const ruleCont = noMissingExports.toRuleCont();

      describe('when the package contains no "exports" field', function () {
        beforeEach(function () {
          ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-no-exports'));
        });

        it('should not return a RuleFailure', async function () {
          await expect(
            applyRules(ruleConfig, pkg, ruleCont),
            'to be fulfilled with value satisfying',
            {
              passed: [
                {
                  rule: noMissingExports.toJSON(),
                  context: {
                    pkgJson: expect.it('to be an object'),
                    pkgJsonPath: expect.it('to be a string'),
                    pkgPath: expect.it('to be a string'),
                    severity: RuleSeverities.ERROR,
                  },
                },
              ],
              failed: expect.it('to be empty'),
            },
          );
        });
      });

      describe('when the package contains a string "exports" field', function () {
        describe('when the file is missing', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest(
              'no-missing-exports-main-export',
            ));
          });

          it('should return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                passed: expect.it('to be empty'),
                failed: [
                  {
                    rule: noMissingExports.toJSON(),
                    message: 'Export unreadable at path: ./index.js',
                    failed: true,
                  },
                ],
              },
            );
          });
        });

        describe('when the file is present', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest(
              'no-missing-exports-main-export-ok',
            ));
          });

          it('should not return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                failed: expect.it('to be empty'),
              },
            );
          });
        });
      });

      describe('when the package contains subpath "exports"', function () {
        describe('when a file is missing', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-subpath'));
          });

          it('should return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                passed: expect.it('to be empty'),
                failed: [
                  {
                    rule: noMissingExports.toJSON(),
                    message:
                      'Export "./missing.js" unreadable at path: ./index-missing.js',
                    failed: true,
                  },
                ],
              },
            );
          });
        });

        describe('when no files are missing', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest(
              'no-missing-exports-subpath-ok',
            ));
          });

          it('should not return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                failed: expect.it('to be empty'),
              },
            );
          });
        });

        describe('when a glob pattern is present', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-glob'));
          });

          describe('when all files are missing', function () {
            it('should return a RuleFailure', async function () {
              await expect(
                applyRules(ruleConfig, pkg, ruleCont),
                'to be fulfilled with value satisfying',
                {
                  failed: [
                    {
                      message:
                        'Export "./*.js" matches no files using glob: ./lib/*.js',
                    },
                  ],
                  passed: expect.it('to be empty'),
                },
              );
            });
          });

          describe('when at least one file matches the glob pattern', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-glob-ok'));
            });

            it('should not return a RuleFailure', async function () {
              await expect(
                applyRules(ruleConfig, pkg, ruleCont),
                'to be fulfilled with value satisfying',
                {
                  failed: expect.it('to be empty'),
                },
              );
            });
          });

          describe('when glob patterns are disallowed', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-no-glob', {
                'no-missing-exports': {
                  glob: false,
                },
              }));
            });

            it('should return a RuleFailure', async function () {
              await expect(
                applyRules(ruleConfig, pkg, ruleCont),
                'to be fulfilled with value satisfying',
                {
                  failed: [
                    {
                      message: 'Export "./*.js" contains a glob pattern',
                    },
                  ],
                  passed: expect.it('to be empty'),
                },
              );
            });
          });
        });
      });

      describe('when the package contains conditional "exports"', function () {
        describe('when a file is missing', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest(
              'no-missing-exports-conditional',
            ));
          });

          it('should return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                passed: expect.it('to be empty'),
                failed: [
                  {
                    rule: noMissingExports.toJSON(),
                    message:
                      'Export "require" unreadable at path: ./index-missing.js',
                    failed: true,
                  },
                ],
              },
            );
          });
        });

        describe('when no files are missing', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest(
              'no-missing-exports-conditional-ok',
            ));
          });

          it('should not return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                failed: expect.it('to be empty'),
              },
            );
          });

          describe('when a "require" export is present', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-require'));
            });

            describe('when the file is ESM', function () {
              it('should return a RuleFailure', async function () {
                await expect(
                  applyRules(ruleConfig, pkg, ruleCont),
                  'to be fulfilled with value satisfying',
                  {
                    passed: expect.it('to be empty'),
                    failed: [
                      {
                        rule: noMissingExports.toJSON(),
                        message:
                          'Expected export "require" to be a CJS script at path: ./index.js',
                        failed: true,
                      },
                    ],
                  },
                );
              });
            });
          });

          describe('when an "import" export is present', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-import'));
            });

            describe('when the file is not ESM', function () {
              it('should return a RuleFailure', async function () {
                await expect(
                  applyRules(ruleConfig, pkg, ruleCont),
                  'to be fulfilled with value satisfying',
                  {
                    passed: expect.it('to be empty'),
                    failed: [
                      {
                        rule: noMissingExports.toJSON(),
                        message:
                          'Expected export "import" to be an ESM module at path: ./index.js',
                        failed: true,
                      },
                    ],
                  },
                );
              });
            });
          });

          describe('when an "types" export is present', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-types'));
            });

            describe('when the file does not have a .d.ts extension', function () {
              it('should return a RuleFailure', async function () {
                await expect(
                  applyRules(ruleConfig, pkg, ruleCont),
                  'to be fulfilled with value satisfying',
                  {
                    passed: expect.it('to be empty'),
                    failed: [
                      {
                        rule: noMissingExports.toJSON(),
                        message:
                          'Expected export "types" to be a .d.ts file at path: ./index.js',
                        failed: true,
                      },
                    ],
                  },
                );
              });
            });
          });

          describe('when a "default" export is present', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-exports-default'));
            });

            describe('when it does not appear last in the "exports" obejct', function () {
              it('should return a RuleFailure', async function () {
                await expect(
                  applyRules(ruleConfig, pkg, ruleCont),
                  'to be fulfilled with value satisfying',
                  {
                    passed: expect.it('to be empty'),
                    failed: [
                      {
                        rule: noMissingExports.toJSON(),
                        message:
                          'Conditional export "default" must be the last export',
                        failed: true,
                      },
                    ],
                  },
                );
              });
            });

            describe('when the "order" option is disabled', function () {
              beforeEach(function () {
                ({ruleConfig, pkg} = setupRuleTest(
                  'no-missing-exports-default',
                  {'no-missing-exports': {order: false}},
                ));
              });

              it('should not return a RuleFailure', async function () {
                await expect(
                  applyRules(ruleConfig, pkg, ruleCont),
                  'to be fulfilled with value satisfying',
                  {
                    failed: expect.it('to be empty'),
                  },
                );
              });
            });
          });
        });
      });
    });
  });
});
