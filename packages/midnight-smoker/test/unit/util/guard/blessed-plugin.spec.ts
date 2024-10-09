import {BLESSED_PLUGINS, type BlessedPlugin} from '#plugin/blessed';
import {isBlessedPlugin} from '#util/guard/blessed-plugin';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('guard', function () {
      describe('isBlessedPlugin()', function () {
        it('should return true for a valid BlessedPlugin', function () {
          const validPlugin: BlessedPlugin = BLESSED_PLUGINS[0];
          expect(isBlessedPlugin(validPlugin), 'to be true');
        });

        it('should return false for an invalid BlessedPlugin', function () {
          const invalidPlugin = 'invalidPlugin';
          expect(isBlessedPlugin(invalidPlugin), 'to be false');
        });

        it('should return false for a non-string input', function () {
          const nonStringInput = 12345;
          expect(isBlessedPlugin(nonStringInput), 'to be false');
        });
      });
    });
  });
});
