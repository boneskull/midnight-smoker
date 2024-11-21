import {jsonify} from '#util/jsonify';
import {type Serialized} from '#util/serializable';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('jsonify', function () {
      describe('jsonify()', function () {
        describe('when called with a serializable value', function () {
          it('should return the serialized value', function () {
            const value = {key: 'value'};
            const serializedValue: Serialized<typeof value> = {key: 'value'};
            expect(jsonify(value), 'to equal', serializedValue);
          });
        });

        describe('when called with a jsonifiable object', function () {
          it('should return the value', function () {
            const value = {key: 'value'};
            expect(jsonify(value), 'to equal', value);
          });
        });

        describe('when called with a boolean primitive', function () {
          it('should return the value', function () {
            const value = true;
            expect(jsonify(value), 'to equal', value);
          });
        });

        describe('when called with a string primitive', function () {
          it('should return the value', function () {
            const value = 'string';
            expect(jsonify(value), 'to equal', value);
          });
        });

        describe('when called with a number primitive', function () {
          it('should return the value', function () {
            const value = 1;
            expect(jsonify(value), 'to equal', value);
          });
        });

        describe('when called with an object containing non-jsonifiable values', function () {
          it('should return a jsonifiable object', function () {
            const value = {key: 'value', nonJsonifiable: undefined};
            const expectedValue = {key: 'value'};
            expect(jsonify(value), 'to equal', expectedValue);
          });
        });

        describe('when called with an object containing non-enumerable properties', function () {
          it('should not consider non-enumerable properties', function () {
            const value = Object.defineProperty({}, 'key', {
              enumerable: false,
              value: 'value',
            });
            expect(jsonify(value), 'to equal', {});
          });
        });

        describe('when called with an array containing extra properties', function () {
          it('should not consider extra properties of arrays', function () {
            const value = Object.assign(['value'], {foo: 'value'});
            expect(jsonify(value), 'to equal', ['value']);
          });
        });

        describe('when called with an object containing function properties', function () {
          it('should strip function properties', function () {
            const fn = () => {};
            const value = {fn, key: 'value'};
            const expectedValue = {key: 'value'};
            expect(jsonify(value), 'to equal', expectedValue);
          });
        });

        describe('when called with a function', function () {
          it('should return null', function () {
            const value = () => {};
            expect(jsonify(value), 'to be', null);
          });
        });

        describe('when called with an array containing non-jsonifiable elements', function () {
          it('should return a jsonifiable array', function () {
            const value = [1, 'string', null, undefined];
            const expectedValue = [1, 'string', null, null];
            expect(jsonify(value), 'to equal', expectedValue);
          });
        });

        describe('when called with a Symbol', function () {
          it('should return null', function () {
            const value = Symbol('test');
            expect(jsonify(value), 'to be', null);
          });
        });

        describe('when an object contains a Symbol property', function () {
          it('should strip the Symbol property', function () {
            const value = {key: Symbol('test')};
            expect(jsonify(value), 'to equal', {});
          });
        });

        describe('when called with a non-serializable Error', function () {
          it('should return a string', function () {
            const value = new Error('test');
            expect(jsonify(value), 'to equal', `Error: test`);
          });
        });

        describe('when called with a serializable object', function () {
          it('should return a jsonifiable object', function () {
            const value = {toJSON: () => ({key: 'value'})};
            expect(jsonify(value), 'to equal', {key: 'value'});
          });
        });

        describe('when called with a serializable Error', function () {
          it('should return a jsonifiable object', function () {
            const value = Object.assign(new Error('stuff'), {
              toJSON: () => ({key: 'value'}),
            });
            expect(jsonify(value), 'to equal', {key: 'value'});
          });
        });
      });
    });
  });
});
