import {type SmokerError} from '#error/base-error';
import unexpected from 'unexpected';
import {z} from 'zod';
import {
  type SmokerErrorCode,
  type SmokerErrorId,
} from '../../../src/error/codes';
import {
  isErrnoException,
  isExecaError,
  isSmokerError,
  isZodError,
} from '../../../src/util/error-util';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('error-util', function () {
      describe('isErrnoException', function () {
        it('should return true if value is an ErrnoException', function () {
          const error = Object.assign(new Error('Test error'), {
            code: 'ENOENT',
          });
          expect(
            error,
            'when passed as parameter to',
            isErrnoException,
            'to be true',
          );
        });

        it('should return false if value is not an ErrnoException', function () {
          const error = new Error('Test error');
          expect(
            error,
            'when passed as parameter to',
            isErrnoException,
            'to be false',
          );
        });
      });

      describe('isSmokerError()', function () {
        class TestSmokerError implements SmokerError {
          code = 'FOO' as SmokerErrorCode;

          name = 'TestSmokerError';

          id = 'TestSmokerError' as SmokerErrorId;

          format() {
            return '';
          }

          toJSON(): object {
            return {};
          }

          constructor(public message: string) {}
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

      describe('isExecaError()', function () {
        it('should return true if error is an ExecaError', function () {
          const error = Object.assign(new Error(), {
            command: 'ls',
            exitCode: 1,
            stderr: '',
            stdout: '',
            failed: true,
          });
          expect(isExecaError(error), 'to be true');
        });

        it('should return false if error is not an ExecaError', function () {
          const error = new Error('Test error');
          expect(isExecaError(error), 'to be false');
        });
      });

      describe('isZodError()', function () {
        describe('isZodError', function () {
          it('should return true if error is a ZodError', function () {
            let error: unknown;
            try {
              z.number().parse('foo');
            } catch (err) {
              error = err;
            }
            expect(isZodError(error), 'to be true');
          });

          it('should return false if error is not a ZodError', function () {
            const error = new Error('Test error');
            expect(isZodError(error), 'to be false');
          });
        });
      });
    });
  });
});
