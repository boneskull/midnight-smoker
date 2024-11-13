import {ErrorCode} from '#error/codes';
import {normalizeVersionAgainstData} from '#pkg-manager/version-normalizer';
import {parse, type SemVer} from 'semver';
import unexpected from 'unexpected';
const expect = unexpected.clone();

const npmVersionData = {
  tags: {
    latest: '10.8.2',
    'next-9': '9.9.3',
    'next-10': '10.8.2',
  },
  versions: [
    '9.9.3',
    '10.0.0-pre.0',
    '10.0.0-pre.1',
    '10.0.0',
    '10.1.0',
    '10.2.0',
    '10.2.1',
    '10.2.2',
    '10.2.3',
    '10.2.4',
    '10.2.5',
    '10.3.0',
    '10.4.0',
    '10.5.0',
    '10.5.1',
    '10.5.2',
    '10.6.0',
    '10.7.0',
    '10.8.0',
    '10.8.1',
    '10.8.2',
  ],
};
const {tags: npmDistTags} = npmVersionData;

describe('midnight-smoker', function () {
  describe('package manager', function () {
    describe('normalizeVersion()', function () {
      describe('when provided valid version data', function () {
        describe('when provided a known package manager', function () {
          let normalize: (value: string) => SemVer | undefined;

          beforeEach(function () {
            normalize = normalizeVersionAgainstData(npmVersionData);
          });

          describe('when provided a version range', function () {
            describe('when the range is valid semver', function () {
              it('should return with the max satisfying version for the range', function () {
                expect(
                  normalize('9'),
                  'to equal',
                  parse(npmDistTags['next-9']),
                );
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
              expect(normalize('10.2.1'), 'to equal', parse('10.2.1'));
            });
          });

          describe('when provided a (known) dist-tag', function () {
            it('should return the version', function () {
              expect(
                normalize('latest'),
                'to equal',
                parse(npmDistTags.latest),
              );
            });
          });

          describe('when provided an unknown dist-tag/range', function () {
            it('should return undefined', function () {
              expect(normalize('moooo'), 'to be undefined');
            });
          });
        });
      });

      describe('when provided both version data and a value', function () {
        it('should return a SemVer or undefined', function () {
          expect(
            normalizeVersionAgainstData(npmVersionData, '10.2.1'),
            'to equal',
            parse('10.2.1'),
          );
        });
      });

      describe('when provided invalid version data', function () {
        describe('when provided an empty array of versions', function () {
          it('should throw', function () {
            expect(
              () => normalizeVersionAgainstData({versions: []}),
              'to throw',
              {
                message:
                  /Validation error: Array must contain at least 1 element/,
              },
            );
          });
        });

        describe('when provided an nonempty array of empty strings', function () {
          it('should throw', function () {
            expect(
              () => normalizeVersionAgainstData({versions: ['', '']}),
              'to throw',
              {
                message:
                  /Validation error: String must contain at least 1 character/,
              },
            );
          });
        });

        describe('when provided an array of things that are not valid versions', function () {
          it('should throw', function () {
            const versionData = {
              versions: ['winken', 'blinken', 'nod'],
            };

            expect(() => normalizeVersionAgainstData(versionData), 'to throw', {
              code: ErrorCode.ZodValidationError,
            });
          });
        });
      });
    });
  });
});
