import {type SmokerErrorCode, type SmokerErrorName} from '#error/codes';
import {type SmokerError, type StaticSmokerError} from '#error/smoker-error';
import {isSmokerError} from '#util/guard/smoker-error';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('error-util', function () {
      describe('isSmokerError()', function () {
        class TestSmokerError implements SmokerError {
          cause?: undefined | void;

          code = 'FOO' as SmokerErrorCode;

          context?: undefined | void;

          name = 'TestSmokerError' as SmokerErrorName;

          stack?: string | undefined;

          constructor(public message: string) {}

          format() {
            return '';
          }

          formatCode(_verbose?: boolean): string {
            throw new Error('Method not implemented.');
          }

          formatMessage(_verbose?: boolean): string {
            throw new Error('Method not implemented.');
          }

          toJSON(): StaticSmokerError {
            return {
              cause: {},
              code: this.code,
              context: {},
              message: this.message,
              name: this.name,
            };
          }
        }

        it('should return true if error is a SmokerError', function () {
          const error = new TestSmokerError('message');
          expect(isSmokerError(TestSmokerError, error), 'to be true');
        });

        it('should return false if error is not a SmokerError', function () {
          const error = new Error('Test error');
          expect(isSmokerError(TestSmokerError, error), 'to be false');
        });
      });

      // describe('isExecaError()', function () {
      //   it('should return true if error is an ExecaError', function () {
      //     const execResult: ExecResult = {
      //       command: '',
      //       escapedCommand: '',
      //       exitCode: 0,
      //       failed: false,
      //       isCanceled: false,
      //       killed: false,
      //       stderr: '',
      //       stdout: '',
      //       timedOut: false,
      //     };
      //     const error = Object.assign(new Error('herp'), {
      //       ...execResult,
      //       originalMessage: '',
      //       shortMessage: '',
      //     });
      //     expect(isExecaError(error), 'to be true');
      //   });

      //   it('should return false if error is not an ExecaError', function () {
      //     const error = new Error('Test error');
      //     expect(isExecaError(error), 'to be false');
      //   });
      // });
    });
  });
});
