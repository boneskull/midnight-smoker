import {ExecError} from '#error/exec-error';
import {ExecErrorSchema, ExecResultSchema} from '#schema/exec-result';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('executor', function () {
      describe('schema', function () {
        describe('ExecError schema', function () {
          describe('when provided invalid data', function () {
            it('should throw', function () {
              expect(() => ExecErrorSchema.parse({}), 'to throw');
            });
          });

          describe('when provided valid data', function () {
            it('should not throw', function () {
              expect(
                () =>
                  ExecErrorSchema.parse(
                    new ExecError(
                      Object.assign(new Error('foo'), {
                        exitCode: 1,
                        all: '',
                        stdout: 'foo',
                        isCanceled: false,
                        shortMessage: '',
                        escapedCommand: '',
                        timedOut: false,
                        killed: false,
                        stderr: 'bar',
                        command: '',
                        failed: false,
                      }),
                    ),
                  ),
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
              expect(
                () =>
                  ExecResultSchema.parse({
                    all: '',
                    stdout: 'foo',
                    stderr: 'bar',
                    command: '',
                    exitCode: 1,
                    failed: false,
                  }),
                'not to throw',
              );
            });
          });
        });
      });
    });
  });
});
