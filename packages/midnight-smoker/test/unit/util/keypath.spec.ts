import {formatKeypath} from '#util/keypath';
import {stringToPath} from 'remeda';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('formatKeypath', function () {
      const path = ['some', 'object', 'key-with-dash'];

      it('should round-trip thru R.stringToPath()', function () {
        const keypath = formatKeypath(path);
        const actual = formatKeypath(stringToPath(keypath));
        expect(actual, 'to equal', keypath);
      });

      describe('when path contains integer-like keys', function () {
        const path = ['some', 'object', '0', 'key'];

        it('should format the keypath using brackets', function () {
          const actual = formatKeypath(path);
          expect(actual, 'to equal', 'some.object[0].key');
        });

        describe('when the keys are numbers but invalid integers', function () {
          const path = ['some', 'object', '01', 'key'];

          // eslint-disable-next-line mocha/no-skipped-tests
          it.skip('should format the keypath using brackets', function () {
            const actual = formatKeypath(path);
            expect(actual, 'to equal', 'some.object["01"].key');
          });
        });

        describe('when path contains an inter-like key wrapped in double-quotes', function () {
          const path = ['some', 'object', '"0"', 'key'];

          it('should format the keypath using brackets', function () {
            const actual = formatKeypath(path);
            expect(actual, 'to equal', 'some.object[0].key');
          });
        });

        describe('when path contains an inter-like key wrapped in single-quotes', function () {
          const path = ['some', 'object', "'0'", 'key'];

          it('should format the keypath using brackets', function () {
            const actual = formatKeypath(path);
            expect(actual, 'to equal', 'some.object[0].key');
          });
        });
      });

      describe('when path contains keys that cannot use dot notation', function () {
        const path = ['some', 'object', 'key-with-dash'];

        it('should format the keypath using brackets & double-quotes', function () {
          const actual = formatKeypath(path);
          expect(actual, 'to equal', 'some.object["key-with-dash"]');
        });

        describe('when path contains a key wrapped in double-quotes', function () {
          const path = ['some', 'object', '"key-with-dash"'];

          it('should format the keypath using brackets & double-quotes', function () {
            const actual = formatKeypath(path);
            expect(actual, 'to equal', 'some.object["key-with-dash"]');
          });
        });

        describe('when path contains a key wrapped in single-quotes', function () {
          const path = ['some', 'object', "'key-with-dash'"];

          it('should format the keypath using brackets & double-quotes', function () {
            const actual = formatKeypath(path);
            expect(actual, 'to equal', 'some.object["key-with-dash"]');
          });
        });
      });

      describe('when path contains keys that can use dot notation', function () {
        const path = ['some', 'object', 'key'];

        it('should format the keypath using dots', function () {
          const actual = formatKeypath(path);
          expect(actual, 'to equal', 'some.object.key');
        });

        describe('when path contains a key wrapped in double-quotes', function () {
          const path = ['some', 'object', '"key"'];

          it('should use dot notation', function () {
            const actual = formatKeypath(path);
            expect(actual, 'to equal', 'some.object.key');
          });
        });

        describe('when path contains a key wrapped in single-quotes', function () {
          const path = ['some', 'object', "'key'"];

          it('should use dot notation', function () {
            const actual = formatKeypath(path);
            expect(actual, 'to equal', 'some.object.key');
          });
        });
      });

      describe('when path is empty', function () {
        const path: string[] = [];

        it('should return an empty string', function () {
          const actual = formatKeypath(path);
          expect(actual, 'to equal', '');
        });
      });
    });
  });
});
