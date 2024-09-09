import {ExecError} from '#error/exec-error';
import {type ExecResult, ExecResultSchema} from '#schema/exec-result';
import {ExecaErrorSchema} from '#schema/execa-error';
import {type ExecaError} from 'execa';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('executor', function () {
      describe('schema', function () {
        describe('ExecError schema', function () {
          describe('when provided invalid data', function () {
            it('should throw', function () {
              expect(() => ExecaErrorSchema.parse({}), 'to throw');
            });
          });

          describe('when provided valid data', function () {
            it('should not throw', function () {
              const execaError: ExecaError = Object.assign(new Error('foo'), {
                all: '',
                command: '',
                escapedCommand: '',
                exitCode: 1,
                failed: false,
                isCanceled: false,
                killed: false,
                shortMessage: '',
                stderr: 'bar',
                stdout: 'foo',
                timedOut: false,
              });
              expect(
                () => ExecaErrorSchema.parse(new ExecError(execaError)),
                'not to throw',
              );
            });
          });
        });

        describe('ExecResult schema', function () {
          describe('when provided invalid data', function () {
            it('should throw', function () {
              expect(() => ExecResultSchema.parse({}), 'to throw');
            });
          });

          describe('when provided valid data', function () {
            it('should not throw', function () {
              expect(() => {
                const value: ExecResult = {
                  command: '',
                  escapedCommand: '',
                  exitCode: 0,
                  failed: false,
                  isCanceled: false,
                  killed: false,
                  stderr: '',
                  stdout: '',
                  timedOut: false,
                };
                return ExecResultSchema.parse(value);
              }, 'not to throw');
            });
          });
        });
      });
    });
  });
});
