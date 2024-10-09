import {isJsonifiable} from '#util/guard/jsonifiable';
import {type Jsonifiable} from 'type-fest';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('guard', function () {
      describe('jsonifiable', function () {
        describe('isJsonifiable()', function () {
          it('should return true for a JSON primitive', function () {
            expect(isJsonifiable('string'), 'to be true');
            expect(isJsonifiable(123), 'to be true');
            expect(isJsonifiable(true), 'to be true');
            expect(isJsonifiable(null), 'to be true');
          });

          it('should return true for a JSONifiable array', function () {
            const jsonArray: Jsonifiable[] = ['string', 123, true, null];
            expect(isJsonifiable(jsonArray), 'to be true');
          });

          it('should return true for a JSONifiable object', function () {
            const jsonObject: Jsonifiable = {
              key1: 'value',
              key2: 123,
              key3: true,
              key4: null,
            };
            expect(isJsonifiable(jsonObject), 'to be true');
          });

          it('should return false for a non-JSONifiable value', function () {
            expect(isJsonifiable(undefined), 'to be false'); // Undefined
            expect(isJsonifiable(Symbol('symbol')), 'to be false'); // Symbol
          });

          it('should return false for an array with non-JSONifiable values', function () {
            const invalidArray = ['string', 123, undefined];
            expect(isJsonifiable(invalidArray), 'to be false');
          });

          it('should return false for an object with non-JSONifiable values', function () {
            const invalidObject = {
              key1: 'value',
              key2: 123,
              key3: undefined,
            };
            expect(isJsonifiable(invalidObject), 'to be false');
          });
        });
      });
    });
  });
});
