import {
  createRuleRunner,
  type NamedRuleRunner,
} from '@midnight-smoker/test-util';
import {OK} from 'midnight-smoker/constants';
import {RuleSeverities} from 'midnight-smoker/rule';
import {normalize} from 'node:path';
import unexpected from 'unexpected';

import noMissingEntryPoint from '../../../src/rules/no-missing-entry-point';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('rule', function () {
    describe('no-missing-entry-point', function () {
      let runRule: NamedRuleRunner;
      const name = 'no-missing-entry-point';

      before(async function () {
        runRule = await createRuleRunner(noMissingEntryPoint, name);
      });

      describe('when the package is an ESM package', function () {
        const fixture = normalize(
          `${__dirname}/fixture/no-missing-entry-point-esm`,
        );

        it('should not return a failure', async function () {
          await expect(
            runRule(fixture),
            'to be fulfilled with value satisfying',
            {type: OK},
          );
        });
      });

      describe('when the package has a "main" field', function () {
        describe('when the file is missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-entry-point`,
          );

          it('should return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {
                result: [
                  {
                    ctx: {
                      installPath: expect.it('to be a string'),
                      pkgJsonPath: expect.it('to be a string'),
                      severity: RuleSeverities.Error,
                      workspace: {pkgJson: expect.it('to be an object')},
                    },
                    message:
                      'No entry point found for package "no-missing-entry-point"; file from field "main" unreadable at path: index.js',
                    rule: {name},
                  },
                ],
              },
            );
          });
        });

        describe('when the file exists', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-entry-point-ok`,
          );

          it('should not return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {type: OK},
            );
          });
        });
      });

      describe('when the package has no "main" field', function () {
        describe('when the file is missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-entry-point`,
          );

          it('should return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {
                result: [
                  {
                    ctx: {
                      installPath: expect.it('to be a string'),
                      pkgJsonPath: expect.it('to be a string'),
                      severity: RuleSeverities.Error,
                      workspace: {pkgJson: expect.it('to be an object')},
                    },
                    message:
                      'No entry point found for package "no-missing-entry-point"; file from field "main" unreadable at path: index.js',
                    rule: {name},
                  },
                ],
              },
            );
          });
        });

        describe('when the file exists', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-entry-point-node-resolution-ok`,
          );

          it('should not return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {type: OK},
            );
          });
        });
      });
    });
  });
});
