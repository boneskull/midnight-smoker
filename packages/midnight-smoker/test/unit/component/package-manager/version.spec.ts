import {SemVer, parse} from 'semver';
import unexpected from 'unexpected';
import {normalizeVersion} from '../../../../src/component/package-manager/version';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('package manager', function () {
    describe('normalizeVersion()', function () {
      describe('when provided a package manager', function () {
        describe('when provided a version range', function () {
          describe('when the range is valid semver', function () {
            it('should resolve with the max satisfying version for the range', function () {
              expect(normalizeVersion('npm', '9'), 'to equal', parse('9.8.1'));
            });

            describe('when the range is not satisfied', function () {
              it('should throw', function () {
                expect(() => normalizeVersion('npm', '^999999'), 'to throw', {
                  code: 'ESMOKER_UNKNOWNVERSIONRANGE',
                });
              });
            });
          });
        });

        describe('when not provided a version range', function () {
          it('should resolve with the latest version', function () {
            expect(normalizeVersion('npm'), 'to be a', SemVer);
          });
        });

        describe('when provided an invalid version', function () {
          it('should reject', function () {
            expect(
              () => normalizeVersion('npm', '0.999.0'),
              'to throw',
              /unknown version/i,
            );
          });
        });

        describe('when provided a valid (known) version', function () {
          it('should resolve with the version', function () {
            expect(
              normalizeVersion('npm', '9.8.1'),
              'to equal',
              parse('9.8.1'),
            );
          });
        });

        describe('when provided a (known) dist-tag', function () {
          it('should resolve with the version', function () {
            expect(
              normalizeVersion('npm', 'latest'),
              'to equal',
              parse('9.8.1'),
            );
          });
        });

        describe('when provided an unknown dist-tag (or invalid range)', function () {
          it('should reject', function () {
            expect(
              () => normalizeVersion('npm', 'moooo'),
              'to throw',
              /unknown version/i,
            );
          });
        });
      });
    });
  });
});
