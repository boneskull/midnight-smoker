import unexpected from 'unexpected';
import type {PackedPackage} from '../../../src';
import {CheckSeverities, type RawCheckOptions} from '../../../src/rules';
import noBannedFiles from '../../../src/rules/builtin/no-banned-files';
import {applyRules, setupRuleTest} from './rule-helpers';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('rules', function () {
    let ruleConfig: RawCheckOptions;
    let pkg: PackedPackage;

    describe('severity behavior', function () {
      describe('when severity for a rule is configured to "warn"', function () {
        beforeEach(function () {
          ({ruleConfig, pkg} = setupRuleTest('no-banned-files', {
            'no-banned-files': 'warn',
          }));
        });

        it('should return a RuleFailure with severity "warn"', async function () {
          const ruleCont = noBannedFiles.toRuleCont();
          await expect(
            applyRules(ruleConfig, pkg, ruleCont),
            'to be fulfilled with value satisfying',
            {
              failed: expect.it('to satisfy', [
                {
                  rule: noBannedFiles.toJSON(),
                  message: 'Banned file found: id_rsa (Private SSH key)',
                  context: {
                    pkgJson: expect.it('to be an object'),
                    pkgJsonPath: expect.it('to be a string'),
                    pkgPath: expect.it('to be a string'),
                    severity: CheckSeverities.WARN,
                  },
                },
              ]),
            },
          );
        });
      });

      describe('when severity for a rule is configured to "off"', function () {
        beforeEach(function () {
          ({ruleConfig, pkg} = setupRuleTest('no-banned-files', {
            'no-banned-files': 'off',
          }));
        });

        it('should not return a RuleFailure', async function () {
          const ruleCont = noBannedFiles.toRuleCont();
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
