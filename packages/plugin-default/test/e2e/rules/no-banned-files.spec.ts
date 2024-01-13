import {registerRule, safePath} from '@midnight-smoker/test-util';
import type {Component} from 'midnight-smoker/plugin';
import {Rule} from 'midnight-smoker/plugin';
import unexpected from 'unexpected';
import noBannedFilesDef from '../../../src/rules/no-banned-files';
import {applyRule} from './helpers';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  let noBannedFiles: Component<Rule.SomeRule>;

  describe('rule', function () {
    describe('no-banned-files', function () {
      before(async function () {
        noBannedFiles = await registerRule(noBannedFilesDef);
      });

      describe('when the package contains a banned file', function () {
        const fixture = safePath(`${__dirname}/fixture/no-banned-files`);

        it('should return a failure for each banned file', async function () {
          await expect(
            applyRule(noBannedFiles, fixture),
            'to be fulfilled with value satisfying',
            [
              {
                rule: noBannedFiles.toJSON(),
                message: 'Banned file found: id_rsa (Private SSH key)',
                context: {
                  pkgJson: expect.it('to be an object'),
                  pkgJsonPath: expect.it('to be a string'),
                  installPath: expect.it('to be a string'),
                  severity: Rule.RuleSeverities.Error,
                },
              },
            ],
          );
        });
      });

      describe('with config', function () {
        const config = {
          deny: ['anarchist-cookbook.txt'],
          allow: ['id_rsa'],
        };

        const fixture = safePath(`${__dirname}/fixture/no-banned-files-cfg`);

        it('should allow additional files to be banned', async function () {
          await expect(
            applyRule(noBannedFiles, fixture, config),
            'to be fulfilled with value satisfying',
            [
              {
                rule: noBannedFiles.toJSON(),
                message:
                  'Banned file found: anarchist-cookbook.txt (per custom deny list)',
                context: {
                  pkgJson: expect.it('to be an object'),
                  pkgJsonPath: expect.it('to be a string'),
                  installPath: expect.it('to be a string'),
                  severity: Rule.RuleSeverities.Error,
                },
              },
            ],
          );
        });
      });
    });
  });
});
