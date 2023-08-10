import unexpected from 'unexpected';
import {normalizeVersion} from '../../../src/pm/version';
import {SemVer, parse} from 'semver';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('package manager', function () {
    describe('normalizeVersion()', function () {
      describe('when provided a package manager', function () {
        describe('when provided a version range', function () {
          describe('when the range is valid semver', function () {
            it('should resolve with the max satisfying version for the range', async function () {
              expect(
                await normalizeVersion('npm', '9'),
                'to equal',
                parse('9.8.1'),
              );
            });

            describe('when the range is not satisfied', function () {
              it('should reject', async function () {
                await expect(
                  normalizeVersion('npm', '^999999'),
                  'to be rejected with error satisfying',
                  /no version found for "npm" matching range/i,
                );
              });
            });
          });
        });

        describe('when not provided a version range', function () {
          it('should resolve with the latest version', async function () {
            expect(await normalizeVersion('npm'), 'to be a', SemVer);
          });
        });

        describe('when provided an invalid version', function () {
          it('should reject', async function () {
            await expect(
              normalizeVersion('npm', '0.999.0'),
              'to be rejected with error satisfying',
              /unknown version/i,
            );
          });
        });

        describe('when provided a valid (known) version', function () {
          it('should resolve with the version', async function () {
            expect(
              await normalizeVersion('npm', '9.8.1'),
              'to equal',
              parse('9.8.1'),
            );
          });
        });

        describe('when provided a (known) dist-tag', function () {
          it('should resolve with the version', async function () {
            expect(
              await normalizeVersion('npm', 'latest'),
              'to equal',
              parse('9.8.1'),
            );
          });
        });

        describe('when provided an unknown dist-tag (or invalid range)', function () {
          it('should reject', async function () {
            await expect(
              normalizeVersion('npm', 'moooo'),
              'to be rejected with error satisfying',
              /unknown version/i,
            );
          });
        });
      });
    });
  });
});
