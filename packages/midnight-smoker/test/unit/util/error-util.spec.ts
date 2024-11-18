import {BaseSmokerError} from '#error/base-error';
import {type SmokerErrorCode, type SmokerErrorName} from '#error/codes';
import {isSmokerError} from '#util/guard/smoker-error';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('error-util', function () {
      describe('isSmokerError()', function () {
        class TestSmokerError extends BaseSmokerError {
          override code = 'FOO' as SmokerErrorCode;

          override name = 'TestSmokerError' as SmokerErrorName;
        }

        it('should return true if error is a SmokerError', function () {
          const error = new TestSmokerError('message');
          expect(
            isSmokerError(TestSmokerError, error, {TestSmokerError: 'FOO'}),
            'to be true',
          );
        });

        it('should return false if error is not a SmokerError', function () {
          const error = new Error('Test error');
          expect(isSmokerError(TestSmokerError, error, {}), 'to be false');
        });
      });
    });
  });
});
