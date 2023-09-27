import unexpected from 'unexpected';
import {parseOptions} from '../../src/options';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('options', function () {
    describe('parseOptions()', function () {
      describe('when provided no options', function () {
        it('should not throw', function () {
          expect(() => parseOptions(), 'not to throw');
        });
      });

      describe('when provided unknown options', function () {
        it('should not throw', function () {
          // @ts-expect-error bad type
          expect(() => parseOptions({cows: true}), 'not to throw');
        });
      });

      describe('when provided invalid options', function () {
        it('should throw', function () {
          expect(
            () => parseOptions({all: true, workspace: ['foo']}),
            'to throw',
            /Option "workspace" is mutually exclusive with "all"/,
          );
        });
      });
    });
  });
});
