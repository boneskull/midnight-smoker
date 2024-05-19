import {partial} from 'lodash';
import {type CheckOutput} from 'midnight-smoker/machine';
import {RuleSeverities, type SomeRuleOptions} from 'midnight-smoker/rule';
import {normalize} from 'node:path';
import unexpected from 'unexpected';
import noMissingPkgFiles from '../../../src/rules/no-missing-pkg-files';
import {createRuleRunner} from './helpers';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('rule', function () {
    describe('no-missing-pkg-files', function () {
      let applyRule: (
        installPath: string,
        opts?: SomeRuleOptions,
      ) => Promise<CheckOutput[]>;

      before(async function () {
        const runner = await createRuleRunner(noMissingPkgFiles);
        applyRule = partial(runner, 'no-missing-pkg-files');
      });
      describe('when run without options', function () {
        describe('when the "bin" field is an object', function () {
          describe('when the file is missing', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-pkg-files`,
            );

            it('should return a failure', async function () {
              await expect(
                applyRule(fixture),
                'to be fulfilled with value satisfying',
                [
                  {
                    rule: 'no-missing-pkg-files',
                    message:
                      'File "no-missing-pkg-files" from "bin" field unreadable at path: ./bin/no-missing-pkg-files.js',
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

          describe('when the file is present', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-pkg-files-ok`,
            );

            it('should not return a failure', async function () {
              await expect(
                applyRule(fixture),
                'to be fulfilled with',
                undefined,
              );
            });
          });
        });

        describe('when the "bin" field is a string', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-pkg-files-string-bin`,
          );

          it('should return a failure', async function () {
            await expect(
              applyRule(fixture),
              'to be fulfilled with value satisfying',
              [
                {
                  rule: 'no-missing-pkg-files',
                  message:
                    'File from "bin" field unreadable at path: ./bin/no-missing-pkg-files.js',
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

        describe('when the "types" field is a string', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-pkg-files-types`,
          );

          it('should return a failure', async function () {
            await expect(
              applyRule(fixture),
              'to be fulfilled with value satisfying',
              [
                {
                  rule: 'no-missing-pkg-files',
                  message:
                    'File from "types" field unreadable at path: index.d.ts',
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

        describe('when the "browser" field is a string', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-pkg-files-browser`,
          );

          it('should return a failure', async function () {
            await expect(
              applyRule(fixture),
              'to be fulfilled with value satisfying',
              [
                {
                  rule: 'no-missing-pkg-files',
                  message:
                    'File from "browser" field unreadable at path: index.browser.js',
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
      });

      describe('when run with options', function () {
        describe('when "bin" is set to false', function () {
          describe('when the file is missing', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-pkg-files`,
            );

            it('should return no failures', async function () {
              await expect(
                applyRule(fixture, {bin: false}),
                'to be fulfilled with',
                undefined,
              );
            });
          });
        });
      });
    });
  });
});
