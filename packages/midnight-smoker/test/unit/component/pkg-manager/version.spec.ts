import {npmVersionData} from '@midnight-smoker/plugin-default/data';
import {parse} from 'semver';
import unexpected from 'unexpected';
import {normalizeVersion} from '../../../../src/pkg-manager/pkg-manager-version';
const expect = unexpected.clone();
const npmDistTags = npmVersionData.tags;

describe('midnight-smoker', function () {
  describe('package manager', function () {
    describe('normalizeVersion()', function () {
      describe('when provided a known package manager', function () {
        let normalize: (value: string) => ReturnType<typeof normalizeVersion>;

        beforeEach(function () {
          normalize = normalizeVersion(npmVersionData);
        });

        describe('when provided a version range', function () {
          describe('when the range is valid semver', function () {
            it('should return with the max satisfying version for the range', function () {
              expect(normalize('9'), 'to equal', parse(npmDistTags['next-9']));
            });

            describe('when the range is not satisfied', function () {
              it('return undefined', function () {
                expect(normalize('^999999'), 'to be undefined');
              });
            });
          });
        });

        describe('when not provided a version range', function () {
          it('should throw', function () {
            // @ts-expect-error - bad type
            expect(() => normalize(undefined), 'to throw');
          });
        });

        describe('when provided an invalid version', function () {
          it('should return undefined', function () {
            expect(normalize('0.999.0'), 'to be undefined');
          });
        });

        describe('when provided a valid (known) version', function () {
          it('should return the version', function () {
            expect(normalize('9.8.1'), 'to equal', parse('9.8.1'));
          });
        });

        describe('when provided a (known) dist-tag', function () {
          it('should return the version', function () {
            expect(normalize('latest'), 'to equal', parse(npmDistTags.latest));
          });
        });

        describe('when provided an unknown dist-tag/range', function () {
          it('should return undefined', function () {
            expect(normalize('moooo'), 'to be undefined');
          });
        });
      });
    });
  });
});
