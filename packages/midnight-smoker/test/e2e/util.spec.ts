import path from 'node:path';
import unexpected from 'unexpected';
import {pickPackageVersion} from '../../src/util';
const expect = unexpected.clone();

const FIXTURE_DIR = path.join(__dirname, 'fixture', 'pick-package-version');

describe('midnight-smoker', function () {
  describe('additional package version picker', function () {
    describe('when provided a package name and spec', function () {
      it('should return the package name and spec', async function () {
        await expect(
          pickPackageVersion('foo@1.0.0'),
          'to be fulfilled with',
          'foo@1.0.0',
        );
      });
    });

    describe('when provided a url to a git repo', function () {
      it('should return the url', async function () {
        await expect(
          pickPackageVersion(
            'https://github.com/boneskull/midnight-smoker.git',
          ),
          'to be fulfilled with',
          'https://github.com/boneskull/midnight-smoker.git',
        );
      });
    });

    describe('when provided a package name w/o a spec', function () {
      describe('when the package does not appear in the local package.json', function () {
        it('should return the package name and "latest" tag', async function () {
          await expect(
            pickPackageVersion('foo'),
            'to be fulfilled with',
            'foo@latest',
          );
        });
      });

      describe('when the package appears in the local package.json in the "devDependencies" and "peerDependencies" fields', function () {
        it('should return the package and spec from the "devDependencies" field', async function () {
          await expect(
            pickPackageVersion('mocha', path.join(FIXTURE_DIR, 'dev-peer')),
            'to be fulfilled with',
            'mocha@10.2.0',
          );
        });
      });

      describe('when the package appears in the local package.json in the "dependencies" and "peerDependencies" fields', function () {
        it('should return the package and spec from the "dependencies" field', async function () {
          await expect(
            pickPackageVersion('mocha', path.join(FIXTURE_DIR, 'prod-peer')),
            'to be fulfilled with',
            'mocha@10.2.0',
          );
        });
      });

      describe('when the package appears in the local package.json in the "optionalDependencies" and "peerDependencies" fields', function () {
        it('should return the package and spec from the "optionalDependencies" field', async function () {
          await expect(
            pickPackageVersion(
              'mocha',
              path.join(FIXTURE_DIR, 'optional-peer'),
            ),
            'to be fulfilled with',
            'mocha@10.2.0',
          );
        });
      });

      describe('when the package appears in the local package.json in the "peerDependencies" field only', function () {
        it('should return the package and spec from the "peerDependencies" field', async function () {
          await expect(
            pickPackageVersion('mocha', path.join(FIXTURE_DIR, 'peer')),
            'to be fulfilled with',
            'mocha@^10.0.0',
          );
        });
      });
    });
  });
});
