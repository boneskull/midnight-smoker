import {execSmoker} from '@midnight-smoker/test-util';
import path from 'node:path';
import unexpected from 'unexpected';
import assertions from '../assertions';

const expect = unexpected.clone().use(assertions);
const FIXTURE_DIR = path.join(__dirname, 'fixture', 'plugin');

describe('midnight-smoker [E2E]', function () {
  describe('plugin support', function () {
    describe('when a plugin provides a custom name', function () {
      const pluginCwd = path.join(FIXTURE_DIR, 'custom-name');
      describe('the custom name should be used', function () {
        it('should use the custom name for the ID', async function () {
          await expect(
            execSmoker(['--plugin', pluginCwd, 'list', 'plugins']),
            'to be fulfilled with value satisfying',
            {
              stdout: /mcmonkey-mcbean.+custom-name/,
            },
          );
        });
      });
    });

    describe('when a plugin is a phony ES module (CJS)', function () {
      const pluginCwd = path.join(FIXTURE_DIR, 'ersatz-esm');

      describe('the plugin should be loaded properly', function () {
        it('should load the plugin', async function () {
          await expect(
            execSmoker(['--plugin', pluginCwd, 'list', 'plugins']),
            'to be fulfilled with value satisfying',
            {
              stdout: /mcmonkey-mcbean.+ersatz-esm/,
            },
          );
        });
      });
    });

    describe('when a plugin is an ES module', function () {
      const pluginCwd = path.join(FIXTURE_DIR, 'esm');

      describe('the plugin should be loaded properly', function () {
        it('should load the plugin', async function () {
          await expect(
            execSmoker(['--plugin', pluginCwd, 'list', 'plugins']),
            'to be fulfilled with value satisfying',
            {
              stdout: /esm-plugin/,
            },
          );
        });
      });
    });

    describe('when a plugin is an ES module by way of .mjs and has a default export', function () {
      const pluginCwd = path.join(FIXTURE_DIR, 'mjs');

      describe('the plugin should be loaded properly', function () {
        it('should load the plugin', async function () {
          await expect(
            execSmoker(['--plugin', pluginCwd, 'list', 'plugins']),
            'to be fulfilled with value satisfying',
            {
              stdout: /mjs-plugin/,
            },
          );
        });
      });
    });

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
                    lint: {
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
