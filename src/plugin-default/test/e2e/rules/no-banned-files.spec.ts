import {
  createRuleRunner,
  type NamedRuleRunner,
} from '@midnight-smoker/test-util';
import {RuleSeverities} from 'midnight-smoker/rule';
import {normalize} from 'node:path';
import unexpected from 'unexpected';

import noBannedFiles from '../../../src/rules/no-banned-files.js';

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
                  ctx: {
                    installPath: expect.it('to be a string'),
                    pkgJsonPath: expect.it('to be a string'),
                    severity: RuleSeverities.Error,
                    workspace: {pkgJson: expect.it('to be an object')},
                  },
                  message: 'Banned file found: id_rsa (Private SSH key)',
                  rule: {name},
                },
              ],
            },
          );
        });
      });

      describe('with config', function () {
        const config = {
          allow: ['id_rsa'],
          deny: ['anarchist-cookbook.txt'],
        };

        const fixture = normalize(`${__dirname}/fixture/no-banned-files-cfg`);

        it('should allow additional files to be banned', async function () {
          await expect(
            runRule(fixture, config),
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
                    'Banned file found: anarchist-cookbook.txt (per custom deny list)',
                  rule: {name},
                },
              ],
            },
          );
        });
      });
    });
  });
});
