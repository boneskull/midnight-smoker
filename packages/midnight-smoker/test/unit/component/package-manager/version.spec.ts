import rewiremock from 'rewiremock/node';
import {SemVer, parse} from 'semver';
import unexpected from 'unexpected';
import npmDistTags from '../../../../data/npm-dist-tags.json';
import type * as V from '../../../../src/component/pkg-manager/version';
import {createFsMocks} from '../../mocks/fs';
const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('package manager', function () {
    describe('normalizeVersion()', function () {
      let normalizeVersion: typeof V.normalizeVersion;
      beforeEach(function () {
        const {mocks} = createFsMocks();
        ({normalizeVersion} = rewiremock.proxy(
          () => require('../../../../src/component/pkg-manager/version'),
          mocks,
        ));
      });
      describe('when provided a known package manager', function () {
        describe('when provided a version range', function () {
          describe('when the range is valid semver', function () {
            it('should resolve with the max satisfying version for the range', function () {
              expect(
                normalizeVersion('npm', '9'),
                'to equal',
                parse(npmDistTags['next-9']),
              );
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
            expect(() => normalizeVersion('npm', '0.999.0'), 'to throw', {
              code: 'ESMOKER_UNKNOWNVERSION',
            });
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
              parse(npmDistTags.latest),
            );
          });
        });

        describe('when provided an unknown dist-tag/range', function () {
          it('should reject', function () {
            expect(() => normalizeVersion('npm', 'moooo'), 'to throw error', {
              code: 'ESMOKER_UNKNOWNDISTTAG',
            });
          });
        });
      });

      describe('when provided an unknown pkg manager', function () {
        describe('when provided a version/dist-tag', function () {
          it('should return undefined', function () {
            expect(normalizeVersion('argle', 'bargle'), 'to be undefined');
          });
        });

        describe('when not provided a version/dist-tag', function () {
          it('should return undefined', function () {
            expect(normalizeVersion('argle'), 'to be undefined');
          });
        });
      });
    });
  });
});
