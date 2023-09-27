import unexpected from 'unexpected';
import {zCheckOptions} from '../../src/rules/check-options';
const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('rule', function () {
    describe('rule options schema', function () {
      it('should allow undefined', function () {
        expect(() => zCheckOptions.parse(undefined), 'not to throw');
      });

      it('should allow an empty object', function () {
        expect(() => zCheckOptions.parse({}), 'not to throw');
      });
    });

    it('should allow overriding of severity', function () {
      expect(zCheckOptions.parse({'no-banned-files': 'warn'}), 'to satisfy', {
        'no-banned-files': {
          severity: 'warn',
        },
      });
    });

    it('should allow overriding of options', function () {
      expect(
        zCheckOptions.parse({'no-missing-exports': {glob: false}}),
        'to satisfy',
        {
          'no-missing-exports': {
            opts: {
              glob: false,
            },
          },
        },
      );
    });

    it('should allow overriding of options and severity', function () {
      expect(
        zCheckOptions.parse({'no-missing-exports': [{glob: false}, 'warn']}),
        'to satisfy',
        {
          'no-missing-exports': {
            severity: 'warn',
            opts: {
              glob: false,
            },
          },
        },
      );
    });
  });
});
