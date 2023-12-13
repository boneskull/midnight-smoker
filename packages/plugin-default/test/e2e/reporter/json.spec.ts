import {execSmoker, fixupOutput} from '@midnight-smoker/test-util';
import {Executor} from 'midnight-smoker/plugin';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';
import assertions from '../../assertions';

const expect = unexpected.clone().use(assertions);

describe('@midnight-smoker/plugin-default', function () {
  describe('reporter', function () {
    describe('json', function () {
      describe('when run without other arguments', function () {
        const cwd = path.join(__dirname, 'fixture', 'single-script');

        it('should produce statistics for checks only', async function () {
          const result = await execSmoker(['--json'], {cwd});
          const {stats} = JSON.parse(fixupOutput(result.stdout, false));
          expect(stats, 'to satisfy', {
            totalPackages: 1,
            totalPackageManagers: 1,
            totalScripts: null,
            failedScripts: null,
            passedScripts: null,
            totalChecks: expect.it('to be greater than', 0),
            failedChecks: 0,
            passedChecks: expect.it('to be greater than', 0),
          });
        });
      });

      describe('when the script succeeds', function () {
        const cwd = path.join(__dirname, 'fixture', 'single-script');

        let result: Executor.ExecResult;

        before(async function () {
          result = await execSmoker(['smoke', '--json', '--no-checks'], {
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
            totalPackages: 1,
            totalPackageManagers: 1,
            totalScripts: 1,
            failedScripts: 0,
            passedScripts: 1,
            totalChecks: null,
            failedChecks: null,
            passedChecks: null,
          });
        });
      });

      describe('when the script fails', function () {
        const cwd = path.join(__dirname, 'fixture', 'failure');

        let result: Executor.ExecResult;

        before(async function () {
          try {
            await execSmoker(['smoke', '--json', '--no-checks'], {cwd});
          } catch (err) {
            result = err as Executor.ExecResult;
          }
        });

        it('should fail', function () {
          expect(result, 'to have failed');
        });

        it('should produce JSON output', async function () {
          expect(result, 'to output valid JSON');
        });

        it('should provide helpful result [snapshot]', async function () {
          const output = JSON.parse(fixupOutput(result.stdout));
          snapshot(output);
        });
      });
    });
  });
});
