import {type ExecaError} from 'execa';
import {type ExecResult} from 'midnight-smoker/executor';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

import {execSmoker} from '../../src/cli';
import {CLI_PATH} from '../../src/constants';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('test-util', function () {
    describe('cli', function () {
      describe('execSmoker()', function () {
        let sandbox: sinon.SinonSandbox;
        let execaStub: sinon.SinonStub;

        beforeEach(function () {
          sandbox = sinon.createSandbox();
          execaStub = sandbox.stub().resolves({
            stdout: JSON.stringify({success: true}),
          } as ExecResult);
        });

        afterEach(function () {
          sandbox.restore();
        });

        it('should execute smoker with given arguments', async function () {
          const args = ['run', 'smoke'];
          const opts = {cwd: '/some/path', execa: {node: execaStub}};
          await execSmoker(args, opts);
          const {execa: _execa, ...rest} = opts;
          expect(execaStub, 'to have a call satisfying', [
            CLI_PATH,
            args,
            {
              env: {...process.env, DEBUG: ''},
              ...rest,
            },
          ]);
        });

        it('should add --json flag if json option is true', async function () {
          const args = ['run', 'smoke'];
          const opts = {
            cwd: '/some/path',
            execa: {node: execaStub},
            json: true,
          };
          await execSmoker(args, opts);
          const {execa: _execa, json: _json, ...rest} = opts;

          expect(execaStub, 'to have a call satisfying', [
            CLI_PATH,
            [...args, '--json'],
            {
              env: {...process.env, DEBUG: ''},
              ...rest,
            },
          ]);
        });

        it('should parse JSON output if json option is true', async function () {
          const args = ['run', 'smoke'];
          const opts = {
            cwd: '/some/path',
            execa: {node: execaStub},
            json: true,
          };
          const result = await execSmoker(args, opts);

          expect(result, 'to equal', {success: true});
        });

        it('should throw an error if execution fails', async function () {
          const args = ['run', 'smoke'];
          const opts = {cwd: '/some/path', execa: {node: execaStub}};
          const error = new Error('Execution failed');
          execaStub.rejects(error);

          await expect(execSmoker(args, opts), 'to be rejected with', error);
        });

        it('should fulfill with JSON error output if `json` option is true and some rando error ius thrown', async function () {
          const args = ['run', 'smoke'];
          const opts = {
            cwd: '/some/path',
            execa: {node: execaStub},
            json: true,
          };

          const error = new Error('Execution failed');
          execaStub.rejects(error);

          await expect(execSmoker(args, opts), 'to be rejected with', error);
        });

        it('should fulfill with JSON error output if `json` option is true and execa throws', async function () {
          const args = ['run', 'smoke'];
          const opts = {
            cwd: '/some/path',
            execa: {node: execaStub},
            json: true,
          };

          // JSON will only be parsed if the error thrown is an ExecaError
          const error: ExecaError = Object.assign(
            new Error('Execution failed'),
            {
              all: '',
              command: '',
              escapedCommand: '',
              exitCode: 1,
              failed: true,
              isCanceled: false,
              killed: false,
              originalMessage: '',
              shortMessage: '',
              stderr: '',
              stdout: JSON.stringify({error: 'Something went wrong'}),
              timedOut: false,
            },
          );
          execaStub.rejects(error);

          await expect(execSmoker(args, opts), 'to be fulfilled with', {
            error: 'Something went wrong',
          });
        });
      });
    });
  });
});
