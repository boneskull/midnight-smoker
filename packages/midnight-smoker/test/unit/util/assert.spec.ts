import {AssertionError} from '#error/assertion-error';
import * as assert from '#util/assert';
import unexpected from 'unexpected';

const expect = unexpected.clone();
describe('midnight-smoker', function () {
  describe('util', function () {
    describe('assert', function () {
      describe('ok()', function () {
        it('should not throw an error for truthy values', function () {
          expect(() => {
            assert.ok(true);
          }, 'not to throw');
        });

        it('should throw an AssertionError for falsy values', function () {
          expect(
            () => {
              assert.ok(false);
            },
            'to throw an',
            AssertionError,
          );
        });

        it('should throw an AssertionError with the custom message', function () {
          expect(
            () => {
              assert.ok(false, 'Custom error message');
            },
            'to throw',
            {
              message: 'Custom error message',
            },
          );
        });
      });

      describe('equal()', function () {
        it('should not throw an error for equal values', function () {
          expect(() => {
            assert.equal(1, 1);
          }, 'not to throw');
        });

        it('should throw an AssertionError for non-equal values', function () {
          expect(
            () => {
              assert.equal(1, 2);
            },
            'to throw an',
            AssertionError,
          );
        });

        it('should throw an AssertionError with the custom message for non-equal values', function () {
          expect(
            () => {
              assert.equal(1, 2, 'Values are not equal');
            },
            'to throw',
            {
              message: 'Values are not equal',
            },
          );
        });
      });

      describe('deepEqual()', function () {
        it('should not throw an error for deeply equal values', function () {
          expect(() => {
            assert.deepEqual({a: 1}, {a: 1});
          }, 'not to throw');
        });

        it('should throw an AssertionError for non-deeply equal values', function () {
          expect(
            () => {
              assert.deepEqual({a: 1}, {a: 2});
            },
            'to throw an',
            AssertionError,
          );
        });

        it('should throw an AssertionError with the custom message for non-deeply equal values', function () {
          expect(
            () => {
              assert.deepEqual({a: 1}, {a: 2}, 'Values are not deeply equal');
            },
            'to throw',
            {
              message: 'Values are not deeply equal',
            },
          );
        });
      });
    });
  });
});
