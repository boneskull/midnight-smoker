import unexpected from 'unexpected';
import type {PackedPackage} from '../../../src';
import {CheckSeverities, type RawCheckOptions} from '../../../src/rules';
import noMissingEntryPoint from '../../../src/rules/builtin/no-missing-entry-point';
import {setupRuleTest, applyRules} from './rule-helpers';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('rules', function () {
    let ruleConfig: RawCheckOptions;
    let pkg: PackedPackage;

    describe('no-missing-entry-point', function () {
      const ruleCont = noMissingEntryPoint.toRuleCont();

      describe('when the package is an ESM package', function () {
        beforeEach(function () {
          ({ruleConfig, pkg} = setupRuleTest('no-missing-entry-point-esm'));
        });

        it('should not return a RuleFailure', async function () {
          await expect(
            applyRules(ruleConfig, pkg, ruleCont),
            'to be fulfilled with value satisfying',
            {
              passed: [
                {
                  rule: noMissingEntryPoint.toJSON(),
                  context: {
                    pkgJson: expect.it('to be an object'),
                    pkgJsonPath: expect.it('to be a string'),
                    pkgPath: expect.it('to be a string'),
                    severity: CheckSeverities.ERROR,
                  },
                },
              ],
              failed: expect.it('to be empty'),
            },
          );
        });
      });

      describe('when the package has a "main" field', function () {
        describe('when the file is missing', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest('no-missing-entry-point'));
          });
          it('should return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                failed: [
                  {
                    rule: noMissingEntryPoint.toJSON(),
                    message:
                      'No entry point found for package "no-missing-entry-point"; file from field "main" unreadable at path: index.js',
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

        describe('when the file exists', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest('no-missing-entry-point-ok'));
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

      describe('when the package has no "main" field', function () {
        describe('when the file is missing', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest(
              'no-missing-entry-point-node-resolution',
            ));
          });
          it('should return a RuleFailure', async function () {
            await expect(
              applyRules(ruleConfig, pkg, ruleCont),
              'to be fulfilled with value satisfying',
              {
                failed: [
                  {
                    rule: noMissingEntryPoint.toJSON(),
                    message:
                      'No entry point found for package "no-missing-entry-point"; (index.js, index.json or index.node)',
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

        describe('when the file exists', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest(
              'no-missing-entry-point-node-resolution-ok',
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
