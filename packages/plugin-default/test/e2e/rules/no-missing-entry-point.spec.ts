import {registerRule} from '@midnight-smoker/test-util';
import {PluginRegistry} from 'midnight-smoker/plugin';
import {RuleSeverities, type SomeRule} from 'midnight-smoker/rule';
import {normalize} from 'node:path';
import unexpected from 'unexpected';
import noMissingEntryPointDef from '../../../src/rules/no-missing-entry-point';
import {applyRule} from './helpers';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  let noMissingEntryPoint: SomeRule;

  describe('rule', function () {
    describe('no-missing-entry-point', function () {
      before(async function () {
        const registry = PluginRegistry.create();
        noMissingEntryPoint = await registerRule(
          registry,
          noMissingEntryPointDef,
        );
      });

      describe('when the package is an ESM package', function () {
        const fixture = normalize(
          `${__dirname}/fixture/no-missing-entry-point-esm`,
        );

        it('should not return a failure', async function () {
          await expect(
            applyRule(noMissingEntryPoint, fixture),
            'to be fulfilled with',
            undefined,
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
              applyRule(noMissingEntryPoint, fixture),
              'to be fulfilled with value satisfying',
              [
                {
                  rule: noMissingEntryPoint.toJSON(),
                  message:
                    'No entry point found for package "no-missing-entry-point"; file from field "main" unreadable at path: index.js',
                  context: {
                    pkgJson: expect.it('to be an object'),
                    pkgJsonPath: expect.it('to be a string'),
                    installPath: expect.it('to be a string'),
                    severity: RuleSeverities.Error,
                  },
                },
              ],
            );
          });
        });

        describe('when the file exists', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-entry-point-ok`,
          );

          it('should not return a failure', async function () {
            await expect(
              applyRule(noMissingEntryPoint, fixture),
              'to be fulfilled with',
              undefined,
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
              applyRule(noMissingEntryPoint, fixture),
              'to be fulfilled with value satisfying',
              [
                {
                  rule: noMissingEntryPoint.toJSON(),
                  message:
                    'No entry point found for package "no-missing-entry-point"; file from field "main" unreadable at path: index.js',
                  context: {
                    pkgJson: expect.it('to be an object'),
                    pkgJsonPath: expect.it('to be a string'),
                    installPath: expect.it('to be a string'),
                    severity: RuleSeverities.Error,
                  },
                },
              ],
            );
          });
        });

        describe('when the file exists', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-entry-point-node-resolution-ok`,
          );

          it('should not return a failure', async function () {
            await expect(
              applyRule(noMissingEntryPoint, fixture),
              'to be fulfilled with value satisfying',
              expect.it('to be undefined'),
            );
          });
        });
      });
    });
  });
});
