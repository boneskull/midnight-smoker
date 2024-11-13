import {ExecError} from '#error/exec-error';
import {type ExecOutput} from '#schema/exec-output';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('executor', function () {
      describe('ExecError', function () {
        it('should construct itself from output', function () {
          const output: ExecOutput = Object.assign({
            command: 'testCommand',
            exitCode: 1,
            stderr: 'stderr',
            stdout: 'stdout',
          });

          const execError = new ExecError('Something bad', output);

          expect(execError, 'to satisfy', {
            command: 'testCommand',
            exitCode: 1,
            message: 'Something bad',
            stderr: 'stderr',
            stdout: 'stdout',
          });
        });
      });
    });
  });
});
