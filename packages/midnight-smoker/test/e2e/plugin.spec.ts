import {execSmoker} from '@midnight-smoker/test-util';
import path from 'node:path';
import unexpected from 'unexpected';
import assertions from '../assertions';

const expect = unexpected.clone().use(assertions);
const FIXTURE_DIR = path.join(__dirname, 'fixture', 'plugin');

describe('midnight-smoker [E2E]', function () {
  describe('plugin support', function () {
    describe('when a plugin provides a rule', function () {
      const pluginCwd = path.join(FIXTURE_DIR, 'plugin-rule');

      describe('when the package under test fails the check', function () {
        const cwd = path.join(pluginCwd, 'fixture', 'plugin-rule-failed');

        it('should fail', async function () {
          await expect(
            execSmoker(['--plugin', pluginCwd], {
              cwd,
              json: true,
            }),
            'to be fulfilled with value satisfying',
            {
              error: {
                context: {
                  results: {
                    checks: {
                      issues: [
                        {
                          context: {
                            pkgJson: {
                              name: 'plugin-rule-failed',
                            },
                          },
                          failed: true,
                          rule: {
                            name: 'no-public-pkgs',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          );
        });
      });

      describe('when the package under test passes the check', function () {
        const cwd = path.join(pluginCwd, 'fixture', 'plugin-rule-ok');

        it('should not fail', async function () {
          await expect(
            execSmoker(['--plugin', pluginCwd], {
              cwd,
              json: true,
            }),
            'to be fulfilled',
          );
        });
      });
    });

    describe('when a plugin cannot be found', function () {
      it('should fail', async function () {
        await expect(
          execSmoker(['--plugin', 'does-not-exist']),
          'to be rejected with error satisfying',
          {stderr: /ESMOKER_PLUGINNOTFOUND/},
        );
      });
    });
  });
});
