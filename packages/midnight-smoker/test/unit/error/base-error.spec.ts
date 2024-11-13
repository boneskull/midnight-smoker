import {BUGS_URL} from '#constants';
import {BaseSmokerError} from '#error/base-error';
import {
  formatCode,
  formatErrorMessage,
  formatStackTrace,
  formatUrl,
} from '#util/format';
import {jsonify} from '#util/jsonify';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

class TestSmokerError extends BaseSmokerError<{detail: string}, Error> {
  // @ts-expect-error - unknown error name
  public override readonly name = 'TestSmokerError';
}

class TestBugReportSmokerError extends TestSmokerError {
  public override readonly shouldAskForBugReport = true;
}

describe('midnight-smoker', function () {
  describe('error', function () {
    describe('base-error', function () {
      describe('BaseSmokerError', function () {
        let error: TestSmokerError;

        beforeEach(function () {
          error = new TestSmokerError(
            'Test message',
            {detail: 'some detail'},
            new Error('Cause error'),
          );
        });

        describe('method', function () {
          describe('formatMessage()', function () {
            it('should format the error message correctly', function () {
              const formattedMessage = error.formatMessage(false);
              expect(
                formattedMessage,
                'to equal',
                `${formatErrorMessage('Test message')} ${formatCode(
                  error.code,
                )}`,
              );
            });

            describe('when shouldAskForBugReport is true', function () {
              it('should format the error message with bug report link', function () {
                const errorWithBugReport = new TestBugReportSmokerError(
                  'Test message',
                  {detail: 'some detail'},
                  new Error('Cause error'),
                );
                const formattedMessage =
                  errorWithBugReport.formatMessage(false);
                expect(
                  formattedMessage,
                  'to contain',
                  'This looks like a bug. Please create a',
                ).and('to contain', formatUrl('bug report', BUGS_URL));
              });
            });
          });

          describe('formatCode()', function () {
            it('should format the error code correctly', function () {
              const formattedCode = error.formatCode(false);
              expect(formattedCode, 'to equal', formatCode(error.code));
            });
          });

          describe('formatCause()', function () {
            describe('when cause is an Error', function () {
              it('should format the cause correctly', function () {
                const formattedCause = error.formatCause(false);
                expect(formattedCause, 'to contain', 'Reason:').and(
                  'to contain',
                  'Cause error',
                );
              });
            });

            describe('when cause is a SmokerError', function () {
              it('should format the cause correctly', function () {
                const causeError = new TestSmokerError('Cause message', {
                  detail: 'cause detail',
                });
                error = new TestSmokerError(
                  'Test message',
                  {detail: 'some detail'},
                  causeError,
                );
                const formattedCause = error.formatCause(false);
                expect(formattedCause, 'to contain', 'Reason:').and(
                  'to contain',
                  'Cause message',
                );
              });
            });

            describe('when cause is falsy', function () {
              it('should return an empty string', function () {
                error = new TestSmokerError(
                  'Test message',
                  {detail: 'some detail'},
                  undefined,
                );
                const formattedCause = error.formatCause(false);
                expect(formattedCause, 'to equal', '');
              });
            });
          });

          describe('format()', function () {
            it('should format the error correctly', function () {
              const formattedError = error.format(false);
              expect(formattedError, 'to contain', error.formatMessage(false));
            });

            describe('when verbose is true', function () {
              it('should format the error with stack trace', function () {
                const formattedError = error.format(true);
                expect(formattedError, 'to contain', 'Stack Trace:').and(
                  'to contain',
                  formatStackTrace(error),
                );
              });
            });
          });

          describe('toJSON()', function () {
            it('should convert the error to JSON correctly', function () {
              const json = error.toJSON();
              expect(json, 'to satisfy', {
                cause: jsonify(error.cause),
                code: error.code,
                context: jsonify(error.context),
                message: error.message,
                name: error.name,
                stack: error.stack,
              });
            });
          });

          describe('toString()', function () {
            it('should convert the error to string correctly', function () {
              const errorString = error.toString();
              expect(errorString, 'to equal', error.format());
            });
          });
        });
      });
    });
  });
});
