import {type BlameInfo, JSONBlamer} from '#rule/json-blamer';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';

import {createDebug} from '../debug';

const expect = unexpected.clone();

const debug = createDebug(__filename);

describe('midnight-smoker [E2E]', function () {
  describe('JSONBlamer', function () {
    describe('getContext()', function () {
      let result: BlameInfo;
      let jsonBlamer: JSONBlamer;

      // DO NOT try to stringify this from an object;
      // eslint-plugin-perfectionist will attempt to re-order the keys, and we
      // don't want that.
      const json = `{
  "baz": {
    "qux": "quux"
  },
  "foo": {
    "bar": "baz"
  }
}
`;

      beforeEach(function () {
        jsonBlamer = new JSONBlamer(json, '/path/to/file.json');
        result = jsonBlamer.find('foo.bar')!;
      });

      it('should return the correct context around the keypath location [snapshot]', async function () {
        const output = await jsonBlamer.getContext(result);
        debug(output);
        snapshot(output);
      });

      it('should return a multiline highlighted value [snapshot]', async function () {
        result = jsonBlamer.find('baz')!;
        const output = await jsonBlamer.getContext(result);
        debug(output);
        snapshot(output);
        expect(output.split('\n'), 'to have length', 6);
      });

      it('should return the correct context when the keypath is at the end of the JSON [snapshot]', async function () {
        result = jsonBlamer.find('baz.qux')!;
        const output = await jsonBlamer.getContext(result);
        debug(output);
        snapshot(output);
      });
    });
  });
});
