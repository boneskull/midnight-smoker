import {PluginSchema} from '#schema/plugin';
import unexpected from 'unexpected';
import {ZodError} from 'zod';
const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('schema', function () {
    describe('Plugin', function () {
      describe('when passed a PluginObject', function () {
        it('should return a shallow clone of the PluginObject', function () {
          const rawPlugin = {name: 'foo', plugin: () => {}};
          expect(PluginSchema.parse(rawPlugin), 'to satisfy', {
            name: 'foo',
            plugin: expect.it('to be a function'),
          });
        });
      });

      describe('when passed a Babelized PluginObject', function () {
        it('should resolve the exports and return a shallow clone of the PluginObject', function () {
          const rawPlugin = {
            __esModule: true,
            default: {name: 'foo', plugin: () => {}},
          };
          expect(PluginSchema.parse(rawPlugin), 'to satisfy', {
            name: 'foo',
            plugin: expect.it('to be a function'),
          });
        });
      });

      describe('when passed an object without a "plugin" property', function () {
        it('should throw an error', function () {
          expect(() => PluginSchema.parse({}), 'to throw a', ZodError);
        });
      });
    });
  });
});
