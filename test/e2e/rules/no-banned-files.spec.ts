import unexpected from 'unexpected';
import type {PackedPackage} from '../../../src';
import {CheckSeverities, type RawCheckOptions} from '../../../src/rules';
import noBannedFiles from '../../../src/rules/builtin/no-banned-files';
import {setupRuleTest, applyRules} from './rule-helpers';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('rules', function () {
    let ruleConfig: RawCheckOptions;
    let pkg: PackedPackage;

    describe('no-banned-files', function () {
      const ruleCont = noBannedFiles.toRuleCont();

      describe('when the package contains a banned file', function () {
        describe('when the file is missing', function () {
          beforeEach(function () {
            ({ruleConfig, pkg} = setupRuleTest('no-banned-files'));
          });

          it('should return a RuleFailure for each banned file', async function () {
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
                      severity: CheckSeverities.ERROR,
                    },
                  },
                ]),
              },
            );
          });
        });
      });

      describe('with config', function () {
        beforeEach(function () {
          ({ruleConfig, pkg} = setupRuleTest('no-banned-files-cfg', {
            'no-banned-files': {
              deny: ['anarchist-cookbook.txt'],
              allow: ['id_rsa'],
            },
          }));
        });

        it('should allow additional files to be banned', async function () {
          await expect(
            applyRules(ruleConfig, pkg, ruleCont),
            'to be fulfilled with value satisfying',
            {
              failed: expect.it('to satisfy', [
                {
                  rule: noBannedFiles.toJSON(),
                  message:
                    'Banned file found: anarchist-cookbook.txt (per custom deny list)',
                  context: {
                    pkgJson: expect.it('to be an object'),
                    pkgJsonPath: expect.it('to be a string'),
                    pkgPath: expect.it('to be a string'),
                    severity: CheckSeverities.ERROR,
                  },
                },
              ]),
            },
          );
        });
      });
    });
  });
});
