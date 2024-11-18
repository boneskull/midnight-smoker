import {memoize, once} from '#util/decorator';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('decorator', function () {
      describe('once', function () {
        it('should call the decorated method only once', function () {
          class TestClass {
            @once
            method() {
              return Math.random();
            }
          }

          const instance = new TestClass();
          const result1 = instance.method();
          const result2 = instance.method();

          expect(result1, 'to equal', result2);
        });
      });

      describe('memoize', function () {
        it('should memoize the result of the decorated method', function () {
          class TestClass {
            @memoize()
            method(arg: number) {
              return Math.random() + arg;
            }
          }

          const instance = new TestClass();
          const result1 = instance.method(1);
          const result2 = instance.method(1);

          expect(result1, 'to equal', result2);
        });

        it('should not memoize different arguments', function () {
          class TestClass {
            @memoize()
            method(arg: number) {
              return Math.random() + arg;
            }
          }

          const instance = new TestClass();
          const result1 = instance.method(1);
          const result2 = instance.method(2);

          expect(result1, 'not to equal', result2);
        });
      });
    });
  });
});
