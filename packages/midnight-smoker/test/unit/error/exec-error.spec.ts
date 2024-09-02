import {ExecError} from '#error/exec-error';
import {type ExecaError} from 'execa';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('executor', function () {
      describe('ExecError', function () {
        it('should construct itself from an ExecaError', function () {
          const error: ExecaError = Object.assign(new Error('foo'), {
            all: 'all',
            command: 'testCommand',
            escapedCommand: '',
            exitCode: 1,
            failed: true,
            isCanceled: false,
            killed: false,
            shortMessage: '',
            stderr: 'stderr',
            stdout: 'stdout',
            timedOut: false,
          });

          const execError = new ExecError(error);

          expect(execError, 'to satisfy', {
            all: 'all',
            command: 'testCommand',
            escapedCommand: '',
            exitCode: 1,
            failed: true,
            isCanceled: false,
            killed: false,
            message: 'foo',
            shortMessage: '',
            stderr: 'stderr',
            stdout: 'stdout',
            timedOut: false,
          });
        });
      });
    });
  });
});
