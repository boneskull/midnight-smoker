import {JSONBlamer} from '#rule/json-blamer';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('json-blamer', function () {
      describe('JSONBlamer', function () {
        let jsonBlamer: JSONBlamer;

        beforeEach(function () {
          const json = '{"foo": {"bar": "baz"}}';
          jsonBlamer = new JSONBlamer(json, '/path/to/file.json');
        });

        describe('constructor', function () {
          it('should initialize with the provided JSON string', function () {
            expect(jsonBlamer.json, 'to equal', '{"foo": {"bar": "baz"}}');
          });

          it('should not parse the JSON initially', function () {
            expect(jsonBlamer, 'to satisfy', {ast: undefined});
          });
        });

        describe('find()', function () {
          it('should find the correct result for a given keypath', function () {
            const result = jsonBlamer.find('foo.bar');

            expect(result, 'to satisfy', {
              keypath: 'foo.bar',
              loc: {
                end: {column: 22, line: 1, offset: 21},
                filepath: '/path/to/file.json',
                start: {column: 10, line: 1, offset: 9},
              },
              value: 'baz',
            });
          });

          describe('when the keypath exists twice in the same object', function () {
            const json = `{
  "bar": {
    "foo": {
      "bar": "quux"
    }
  },
  "foo": {
    "bar": "baz"
  }
}`;

            beforeEach(function () {
              jsonBlamer = new JSONBlamer(json, '/path/to/file.json');
            });

            it('should find the correct result for a given keypath', function () {
              const result = jsonBlamer.find('foo.bar');

              expect(result, 'to satisfy', {
                keypath: 'foo.bar',
                loc: {
                  end: {
                    column: 17,
                    line: 8,
                    offset: 84,
                  },
                  filepath: '/path/to/file.json',
                  start: {
                    column: 5,
                    line: 8,
                    offset: 72,
                  },
                },
                value: 'baz',
              });
            });
          });

          describe('when the keypath contains an array index', function () {
            const json = `{
  "foo": [
    {
      "bar": "baz"
    }
  ]
}`;

            beforeEach(function () {
              jsonBlamer = new JSONBlamer(json, '/path/to/file.json');
            });

            it('should return the correct result for keypath containing an array index', function () {
              const result = jsonBlamer.find('foo.0.bar');

              expect(result, 'to satisfy', {
                keypath: 'foo.0.bar',
                loc: {
                  end: {
                    column: 19,
                    line: 4,
                    offset: 37,
                  },
                  filepath: '/path/to/file.json',
                  start: {
                    column: 7,
                    line: 4,
                    offset: 25,
                  },
                },
                value: 'baz',
              });
            });

            it('should return the correct result for keypath containing an array index (alternate, w/ keypath normalization)', function () {
              const result = jsonBlamer.find('foo[0].bar');

              expect(result, 'to satisfy', {
                keypath: 'foo.0.bar',
                loc: {
                  end: {
                    column: 19,
                    line: 4,
                    offset: 37,
                  },
                  filepath: '/path/to/file.json',
                  start: {
                    column: 7,
                    line: 4,
                    offset: 25,
                  },
                },
                value: 'baz',
              });
            });
          });

          it('should return a JSONLocation object having a string representation', function () {
            const result = jsonBlamer.find('foo.bar');
            expect(
              result?.loc.toString(),
              'to equal',
              '/path/to/file.json:1:10',
            );
          });

          it('should return undefined for a non-existent keypath', function () {
            const result = jsonBlamer.find('non.existent');
            expect(result, 'to be undefined');
          });
        });

        describe('getContext()', function () {
          const json = `{
  "foo": {
    "bar": "baz"
  },
  "baz": {
    "qux": "quux"
  }
}`;

          beforeEach(function () {
            jsonBlamer = new JSONBlamer(json, '/path/to/file.json');
          });

          it('should return the correct context around the keypath location', function () {
            const result = jsonBlamer.find('foo.bar');

            const context = jsonBlamer.getContext(result!, {
              before: 1,
            });

            expect(
              context,
              'to be',
              `  "foo": {
    "bar": "baz"
`,
            );
          });

          it('should return the entire JSON if the context exceeds the JSON length', function () {
            const result = jsonBlamer.find('foo.bar');

            const context = jsonBlamer.getContext(result!, {
              before: 10,
            });

            expect(
              context,
              'to be',
              `{
  "foo": {
    "bar": "baz"
`,
            );
          });

          it('should return the correct context when the keypath is at the start of the JSON', function () {
            const result = jsonBlamer.find('foo.bar');

            const context = jsonBlamer.getContext(result!, {
              before: 0,
            });

            expect(
              context,
              'to be',
              `
    "bar": "baz"
`,
            );
          });

          it('should return the correct context when the keypath is at the end of the JSON', function () {
            const result = jsonBlamer.find('baz.qux');

            const context = jsonBlamer.getContext(result!, {
              before: 1,
            });

            expect(
              context,
              'to equal',
              `  "baz": {
    "qux": "quux"
`,
            );
          });
        });
      });
    });
  });
});
