import * as Util from '#util/util';
import path from 'node:path';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('util', function () {
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

      describe('hrRelativePath()', function () {
        it('should return a relative path with a leading "." and path separator', function () {
          const filepath = 'test/path';
          const cwd = process.cwd();
          expect(
            Util.hrRelativePath(filepath, cwd),
            'to equal',
            `.${path.sep}test${path.sep}path`,
          );
        });

        it('should not require a second parameter (cwd)', function () {
          const filepath = 'test/path';
          expect(() => Util.hrRelativePath(filepath), 'not to throw');
        });

        it('should use the process.cwd() as the default cwd', function () {
          const filepath = 'test/path';
          expect(
            Util.hrRelativePath(filepath),
            'to equal',
            `.${path.sep}test${path.sep}path`,
          );
        });

        describe('when the filepath begins with ..', function () {
          it('should return a relative path with a leading ".." and path separator', function () {
            const filepath = '../test/path';
            const cwd = process.cwd();
            expect(
              Util.hrRelativePath(filepath, cwd),
              'to equal',
              `..${path.sep}test${path.sep}path`,
            );
          });
        });
      });
    });
  });
});
