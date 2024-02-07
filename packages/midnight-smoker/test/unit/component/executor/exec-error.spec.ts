import type * as E from '#error/exec-error.js';
import {type ExecaError} from 'execa';
import {pick} from 'lodash';
import rewiremock from 'rewiremock/node';
import unexpected from 'unexpected';
import {createFsMocks} from '../../mocks';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('executor', function () {
      let ExecError: typeof E.ExecError;

      beforeEach(function () {
        const {mocks} = createFsMocks();
        ({ExecError} = rewiremock.proxy(
          () => require('../../../../src/error/exec-error'),
          mocks,
        ));
      });

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
