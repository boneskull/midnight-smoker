import {type ExecaError} from 'execa';
import {pick} from 'lodash';
import unexpected from 'unexpected';
import {ExecError} from '../../../../src/error/exec-error';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('executor', function () {
      describe('ExecError', function () {
        it('should construct itself from an ExecaError', function () {
          const error: ExecaError = Object.assign(new Error('foo'), {
            command: 'testCommand',
            exitCode: 1,
            all: 'all',
            stderr: 'stderr',
            stdout: 'stdout',
            failed: true,
            shortMessage: '',
            escapedCommand: '',
            message: 'error message',
            timedOut: false,
            isCanceled: false,
            killed: false,
          });

          const execError = new ExecError(error);

          expect(
            execError,
            'to satisfy',
            pick(error, [
              'command',
              'all',
              'stderr',
              'stdout',
              'message',
              'failed',
              'exitCode',
            ]),
          );
        });
      });
    });
  });
});
