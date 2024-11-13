import stringify from 'json-stable-stringify';
import {ExecError} from 'midnight-smoker';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

import {createExecMock} from '../../src';
import {execSmoker} from '../../src/cli';
import {CLI_PATH} from '../../src/constants';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('test-util', function () {
    describe('cli', function () {
      describe('execSmoker()', function () {
        const execStub = createExecMock();

        it('should execute smoker with given arguments', async function () {
          const args = ['run', 'smoke'];
          await execSmoker(args, {cwd: '/some/path', exec: execStub});
          expect(execStub, 'to have a call satisfying', [
            CLI_PATH,
            args,
            {
              nodeOptions: {
                cwd: '/some/path',
                env: {...process.env, DEBUG: ''},
              },
            },
          ]);
        });

        it('should add --json flag if json option is true', async function () {
          const args = ['run', 'smoke'];
          await execSmoker(args, {
            cwd: '/some/path',
            exec: execStub,
            json: true,
          });

          expect(execStub, 'to have a call satisfying', [
            CLI_PATH,
            [...args, '--json'],
            {
              nodeOptions: {
                cwd: '/some/path',
                env: {...process.env, DEBUG: ''},
              },
            },
          ]);
        });

        it('should parse JSON output if json option is true', async function () {
          const args = ['run', 'smoke'];
          const result = await execSmoker(args, {
            cwd: '/some/path',
            exec: execStub,
            json: true,
          });

          expect(result, 'to equal', {key: 'value'});
        });

        it('should throw an error if execution fails', async function () {
          const args = ['run', 'smoke'];
          const error = new Error('Execution failed');
          execStub.rejects(error);

          await expect(
            execSmoker(args, {cwd: '/some/path', exec: execStub}),
            'to be rejected with',
            error,
          );
        });

        it('should fulfill with JSON error output if `json` option is true and some rando error is thrown', async function () {
          const args = ['run', 'smoke'];

          const error = new Error('Execution failed');
          execStub.rejects(error);

          await expect(
            execSmoker(args, {
              cwd: '/some/path',
              exec: execStub,
              json: true,
            }),
            'to be rejected with',
            error,
          );
        });

        it('should fulfill with JSON error output if `json` option is true and exec throws an ExecError', async function () {
          const args = ['run', 'smoke'];
          const opts = {
            cwd: '/some/path',
            exec: execStub,
            json: true,
          };

          const errJson = {error: {something: 'went wrong'}};
          const error = new ExecError('oh no', {
            command: '',
            cwd: '/some/path',
            exitCode: 1,
            stderr: '',
            stdout: stringify(errJson),
          });
          execStub.rejects(error);

          await expect(execSmoker(args, opts), 'to be fulfilled with', errJson);
        });
      });
    });
  });
});
