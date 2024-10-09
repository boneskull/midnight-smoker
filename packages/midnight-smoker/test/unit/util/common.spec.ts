import * as Util from '#util/common';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('common', function () {
      describe('castArray()', function () {
        it('should return an empty array for undefined', function () {
          expect(Util.castArray(undefined), 'to equal', []);
        });

        it('should return an array containing the value for non-array values', function () {
          expect(Util.castArray(1), 'to equal', [1]);
        });

        it('should return a compacted array for an array containing undefined', function () {
          expect(Util.castArray([1, undefined]), 'to equal', [1]);
        });
      });

      describe('delta()', function () {
        it('should return a string representing the delta in seconds', function () {
          const startTime = performance.now() - 1000; // 1 second ago
          expect(Util.delta(startTime), 'to be', '1.00');
        });
      });
    });
  });
});
