import * as assertNonEmptyArray from '#util/guard/assert/non-empty-array';
import * as NonEmptyArray from '#util/guard/non-empty-array';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('non-empty-array', function () {
      describe('isNonEmptyArray()', function () {
        it('should return false for an empty array', function () {
          expect(NonEmptyArray.isNonEmptyArray([]), 'to be false');
        });

        it('should return true for a non-empty array', function () {
          expect(NonEmptyArray.isNonEmptyArray([1]), 'to be true');
        });
      });

      describe('assertNonEmptyArray()', function () {
        it('should not throw for a non-empty array', function () {
          expect(() => {
            assertNonEmptyArray.assertNonEmptyArray([1]);
          }, 'not to throw');
        });

        it('should throw for an empty array', function () {
          expect(
            () => {
              assertNonEmptyArray.assertNonEmptyArray([]);
            },
            'to throw',
            'Expected a non-empty array',
          );
        });
      });
    });
  });
});
