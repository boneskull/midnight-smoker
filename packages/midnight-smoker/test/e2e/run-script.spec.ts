import {execSmoker, fixupOutput} from '@midnight-smoker/test-util';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';
import type {ExecResult} from '../../src/component';
import assertions from '../assertions';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker [E2E]', function () {
  describe('custom scripts', function () {
    describe('single script', function () {
      const cwd = path.join(
        __dirname,
        'fixture',
        'run-script',
        'single-script',
      );

      describe('when the script succeeds', function () {
        it('should produce expected output [snapshot]', async function () {
          const {stderr} = await execSmoker(['run', 'smoke', '--no-lint'], {
            cwd,
          });
          snapshot(fixupOutput(stderr));
        });
      });

      describe('when the script fails', function () {
        const cwd = path.join(__dirname, 'fixture', 'run-script', 'failure');

        let result: ExecResult;

        before(async function () {
          try {
            result = await execSmoker(['run', 'smoke', '--no-lint'], {
              cwd,
            });
          } catch (e) {
            result = e as ExecResult;
          }
        });

        it('should produce expected output [snapshot]', async function () {
          snapshot(fixupOutput(result.stderr));
        });

        it('should fail', async function () {
          expect(result, 'to have failed');
        });
      });
    });

    describe('multiple scripts', function () {
      const cwd = path.join(__dirname, 'fixture', 'run-script', 'multi-script');

      describe('when the scripts succeed', function () {
        it('should produce expected output [snapshot]', async function () {
          const {stderr} = await execSmoker(
            ['run', 'smoke:a', 'smoke:b', '--no-lint'],
            {cwd},
          );
          snapshot(fixupOutput(stderr));
        });
      });
    });
  });
});
