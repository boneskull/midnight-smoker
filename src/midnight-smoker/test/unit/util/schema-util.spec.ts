import * as Util from '#util/non-empty-array';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('non-empty-array', function () {
      describe('isNonEmptyArray()', function () {
        it('should return false for an empty array', function () {
          expect(Util.isNonEmptyArray([]), 'to be false');
        });

        it('should return true for a non-empty array', function () {
          expect(Util.isNonEmptyArray([1]), 'to be true');
        });
      });

      describe('assertNonEmptyArray()', function () {
        it('should not throw for a non-empty array', function () {
          expect(() => {
            Util.assertNonEmptyArray([1]);
          }, 'not to throw');
        });

        it('should throw for an empty array', function () {
          expect(
            () => {
              Util.assertNonEmptyArray([]);
            },
            'to throw',
            'Expected a non-empty array',
          );
        });
      });
    });
  });
});
