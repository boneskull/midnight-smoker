import {ErrorCode} from '#error/codes';
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
                keypath: 'foo[0].bar',
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
                keypath: 'foo[0].bar',
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
          describe('when called without a BlameInfo', function () {
            it('should reject', async function () {
              const result = jsonBlamer.find('papa.smurf');
              await expect(
                jsonBlamer.getContext(result!),
                'to be rejected with error satisfying',
                {
                  code: ErrorCode.InvalidArgError,
                },
              );
            });
          });

          describe('when called with an invalid BlameInfo', function () {
            it('should fail with an AssertionError', async function () {
              await expect(
                jsonBlamer.getContext({
                  loc: {
                    end: {
                      line: 0,
                    },
                    start: {
                      line: 0,
                    },
                  },
                } as any),
                'to be rejected with error satisfying',
                {code: ErrorCode.AssertionError},
              );
            });
          });
        });
      });
    });
  });
});
