import {execSmoker, fixupOutput} from '@midnight-smoker/test-util';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';
import type {ExecResult} from '../../src/component';
import assertions from '../assertions';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker [E2E]', function () {
  describe('built-in checks', function () {
    describe('when a check fails', function () {
      describe('when the rule severity is "error"', function () {
        const cwd = path.join(__dirname, 'fixture', 'check', 'check-error');
        let result: ExecResult;

        before(async function () {
          try {
            result = await execSmoker([], {
              cwd,
            });
          } catch (e) {
            result = e as ExecResult;
          }
        });

        it('should exit with a non-zero exit code', function () {
          expect(result.exitCode, 'to be greater than', 0);
        });

        it('should produce expected output [snapshot]', async function () {
          snapshot(fixupOutput(result.stderr));
        });
      });

      describe('when the rule severity is "warn"', function () {
        const cwd = path.join(__dirname, 'fixture', 'check', 'check-warn');
        let result: ExecResult;

        before(async function () {
          result = await execSmoker([], {
            cwd,
          });
        });

        it('should not exit with a non-zero exit code', function () {
          expect(result.exitCode, 'to be', 0);
        });

        it('should produce expected output [snapshot]', async function () {
          snapshot(fixupOutput(result.stderr));
        });
      });

      describe('when the rule severity is "off"', function () {
        const cwd = path.join(__dirname, 'fixture', 'check', 'check-off');
        let result: ExecResult;

        before(async function () {
          result = await execSmoker([], {
            cwd,
          });
        });

        it('should not exit with a non-zero exit code', function () {
          expect(result.exitCode, 'to be', 0);
        });

        it('should produce expected output [snapshot]', async function () {
          snapshot(fixupOutput(result.stderr));
        });
      });
    });
  });
});
