import {execSmoker} from '@midnight-smoker/test-util';
import {type ExecError, type ExecOutput} from 'midnight-smoker';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';

import assertions from '../../assertions';
import {fixupOutput} from '../e2e-helpers';

const expect = unexpected.clone().use(assertions);

describe('@midnight-smoker/plugin-default', function () {
  describe('reporter', function () {
    describe('json', function () {
      describe('when run without other arguments', function () {
        const cwd = path.join(__dirname, 'fixture', 'single-script');

        it('should produce statistics', async function () {
          const result = await execSmoker(['--json'], {cwd});
          const {stats} = JSON.parse(result.stdout);
          expect(stats, 'to satisfy', {
            failedRules: 0,
            failedScripts: null,
            passedRules: expect.it('to be greater than', 0),
            passedScripts: null,
            totalPackageManagers: 1,
            totalPackages: 1,
            totalRules: expect.it('to be greater than', 0),
            totalScripts: null,
          });
        });
      });

      describe('when the script succeeds', function () {
        const cwd = path.join(__dirname, 'fixture', 'single-script');

        let result: ExecOutput;

        before(async function () {
          result = await execSmoker(['run', 'smoke', '--json', '--no-lint'], {
            cwd,
          });
        });

        it('should produce JSON output', function () {
          expect(result, 'to output valid JSON');
        });

        it('should produce expected script output [snapshot]', async function () {
          const output = JSON.parse(fixupOutput(result.stdout));
          snapshot(output);
        });

        it('should produce statistics', async function () {
          const {stats} = JSON.parse(result.stdout);
          expect(stats, 'to satisfy', {
            failedRules: null,
            failedScripts: 0,
            passedRules: null,
            passedScripts: 1,
            totalPackageManagers: 1,
            totalPackages: 1,
            totalRules: null,
            totalScripts: 1,
          });
        });
      });

      describe('when the script fails', function () {
        const cwd = path.join(__dirname, 'fixture', 'failure');

        let result: ExecOutput;

        before(async function () {
          try {
            await execSmoker(['run', 'smoke', '--json', '--no-lint'], {cwd});
          } catch (err) {
            result = err as ExecError;
          }
        });

        it('should fail', function () {
          expect(result, 'to have failed');
        });

        it('should produce JSON output', async function () {
          expect(result, 'to output valid JSON');
        });

        it('should provide helpful result [snapshot]', async function () {
          const stdout = fixupOutput(result.stdout);
          const output = JSON.parse(stdout);
          snapshot(output);
        });
      });
    });
  });
});
