import {
  createRuleRunner,
  type NamedRuleRunner,
} from '@midnight-smoker/test-util';
import {RuleSeverities} from 'midnight-smoker/rule';
import {normalize} from 'node:path';
import unexpected from 'unexpected';
import noBannedFiles from '../../../src/rules/no-banned-files';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('rule', function () {
    describe('no-banned-files', function () {
      let runRule: NamedRuleRunner;
      const name = 'no-banned-files';

      before(async function () {
        runRule = await createRuleRunner(noBannedFiles, name);
      });

      describe('when the package contains a banned file', function () {
        const fixture = normalize(`${__dirname}/fixture/no-banned-files`);

        it('should return a failure for each banned file', async function () {
          await expect(
            runRule(fixture),
            'to be fulfilled with value satisfying',
            {
              result: [
                {
                  rule: name,
                  message: 'Banned file found: id_rsa (Private SSH key)',
                  context: {
                    pkgJson: expect.it('to be an object'),
                    pkgJsonPath: expect.it('to be a string'),
                    installPath: expect.it('to be a string'),
                    severity: RuleSeverities.Error,
                  },
                },
              ],
            },
          );
        });
      });

      describe('with config', function () {
        const config = {
          deny: ['anarchist-cookbook.txt'],
          allow: ['id_rsa'],
        };

        const fixture = normalize(`${__dirname}/fixture/no-banned-files-cfg`);

        it('should allow additional files to be banned', async function () {
          await expect(
            runRule(fixture, config),
            'to be fulfilled with value satisfying',
            {
              result: [
                {
                  rule: name,
                  message:
                    'Banned file found: anarchist-cookbook.txt (per custom deny list)',
                  context: {
                    pkgJson: expect.it('to be an object'),
                    pkgJsonPath: expect.it('to be a string'),
                    installPath: expect.it('to be a string'),
                    severity: RuleSeverities.Error,
                  },
                },
              ],
            },
          );
        });
      });
    });
  });
});
