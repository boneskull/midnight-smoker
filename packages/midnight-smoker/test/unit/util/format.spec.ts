import {hrRelativePath} from '#util/format';
import path from 'node:path';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('common', function () {
      describe('hrRelativePath()', function () {
        it('should return a relative path with a leading "." and path separator', function () {
          const filepath = 'test/path';
          const cwd = process.cwd();
          expect(
            hrRelativePath(filepath, cwd),
            'to equal',
            `.${path.sep}test${path.sep}path`,
          );
        });

        it('should not require a second parameter (cwd)', function () {
          const filepath = 'test/path';
          expect(() => hrRelativePath(filepath), 'not to throw');
        });

        it('should use the process.cwd() as the default cwd', function () {
          const filepath = 'test/path';
          expect(
            hrRelativePath(filepath),
            'to equal',
            `.${path.sep}test${path.sep}path`,
          );
        });
      });
    });
  });
});
