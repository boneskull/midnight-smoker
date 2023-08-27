import unexpected from 'unexpected';
import type {PackedPackage} from '../../../src';
import {CheckSeverities, type RawCheckOptions} from '../../../src/rules';
import noMissingPkgFiles from '../../../src/rules/builtin/no-missing-pkg-files';
import {setupRuleTest, applyRules} from './rule-helpers';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('rules', function () {
    let ruleConfig: RawCheckOptions;
    let pkg: PackedPackage;

    describe('no-missing-pkg-files', function () {
      const ruleCont = noMissingPkgFiles.toRuleCont();

      describe('when run without options', function () {
        describe('when the "bin" field is an object', function () {
          describe('when the file is missing', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-pkg-files'));
            });

            it('should return a RuleFailure', async function () {
              await expect(
                applyRules(ruleConfig, pkg, ruleCont),
                'to be fulfilled with value satisfying',
                {
                  failed: [
                    {
                      rule: noMissingPkgFiles.toJSON(),
                      message:
                        'File "no-missing-pkg-files" from "bin" field unreadable at path: ./bin/no-missing-pkg-files.js',
                      context: {
                        pkgJson: expect.it('to be an object'),
                        pkgJsonPath: expect.it('to be a string'),
                        pkgPath: expect.it('to be a string'),
                        severity: CheckSeverities.ERROR,
                      },
                    },
                  ],
                },
              );
            });
          });

          describe('when the file is present', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-pkg-files-ok'));
            });

            it('should not return a RuleFailure', async function () {
              await expect(
                applyRules(ruleConfig, pkg, ruleCont),
                'to be fulfilled with value satisfying',
                {
                  passed: [
                    {
                      rule: noMissingPkgFiles.toJSON(),
                      context: {
                        pkgJson: expect.it('to be an object'),
                        pkgJsonPath: expect.it('to be a string'),
                        pkgPath: expect.it('to be a string'),
                        severity: CheckSeverities.ERROR,
                      },
                    },
                  ],
                },
              );
            });
          });
        });

        describe('when the "bin" field is a string', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest(
              'no-missing-pkg-files-string-bin',
            ));
          });

          it('should return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                failed: [
                  {
                    rule: noMissingPkgFiles.toJSON(),
                    message:
                      'File from "bin" field unreadable at path: ./bin/no-missing-pkg-files.js',
                    context: {
                      pkgJson: expect.it('to be an object'),
                      pkgJsonPath: expect.it('to be a string'),
                      pkgPath: expect.it('to be a string'),
                      severity: CheckSeverities.ERROR,
                    },
                  },
                ],
              },
            );
          });
        });

        describe('when the "types" field is a string', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest('no-missing-pkg-files-types'));
          });

          it('should return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                failed: [
                  {
                    rule: noMissingPkgFiles.toJSON(),
                    message:
                      'File from "types" field unreadable at path: index.d.ts',
                    context: {
                      pkgJson: expect.it('to be an object'),
                      pkgJsonPath: expect.it('to be a string'),
                      pkgPath: expect.it('to be a string'),
                      severity: CheckSeverities.ERROR,
                    },
                  },
                ],
              },
            );
          });
        });

        describe('when the "browser" field is a string', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest('no-missing-pkg-files-browser'));
          });

          it('should return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                failed: [
                  {
                    rule: noMissingPkgFiles.toJSON(),
                    message:
                      'File from "browser" field unreadable at path: index.browser.js',
                    context: {
                      pkgJson: expect.it('to be an object'),
                      pkgJsonPath: expect.it('to be a string'),
                      pkgPath: expect.it('to be a string'),
                      severity: CheckSeverities.ERROR,
                    },
                  },
                ],
              },
            );
          });
        });
      });

      describe('when run with options', function () {
        describe('when "bin" is set to false', function () {
          describe('when the file is missing', function () {
            beforeEach(function () {
              ({ruleConfig, pkg} = setupRuleTest('no-missing-pkg-files', {
                'no-missing-pkg-files': {bin: false},
              }));
            });

            it('should return no RuleFailures', async function () {
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
