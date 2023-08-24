import rewiremock from 'rewiremock/node';
import unexpected from 'unexpected';
import type {PackageJson} from 'read-pkg';
import {createSandbox} from 'sinon';
import type * as _Util from '../../src/util';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  let Util: typeof _Util;
  let pickPackageVersion: typeof _Util.pickPackageVersion;
  let readPkgStub: sinon.SinonStub<any, PackageJson>;

  let sandbox: sinon.SinonSandbox;
  beforeEach(function () {
    sandbox = createSandbox();
    readPkgStub = sandbox.stub().resolves({
      devDependencies: {
        mocha: '10.2.0',
      },
      dependencies: {
        mocha: '10.0.0',
      },
      optionalDependencies: {
        mocha: '10.1.0',
      },
      peerDependencies: {mocha: '^10.0.0'},
    });
    Util = rewiremock.proxy(() => require('../../src/util'), {
      'read-pkg': readPkgStub,
      'pkg-dir': sandbox.stub().resolves('/some/path'),
    });
    ({pickPackageVersion} = Util);
  });

  describe('util', function () {
    describe('pickPackageVersion()', function () {
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
              pickPackageVersion('mocha'),
              'to be fulfilled with',
              'mocha@10.2.0',
            );
          });
        });

        describe('when the package appears in the local package.json in the "dependencies" and "peerDependencies" fields', function () {
          beforeEach(function () {
            readPkgStub.resolves({
              dependencies: {
                mocha: '10.0.0',
              },
              optionalDependencies: {
                mocha: '10.1.0',
              },
              peerDependencies: {mocha: '^10.0.0'},
            });
          });

          it('should return the package and spec from the "dependencies" field', async function () {
            await expect(
              pickPackageVersion('mocha'),
              'to be fulfilled with',
              'mocha@10.0.0',
            );
          });
        });

        describe('when the package appears in the local package.json in the "optionalDependencies" and "peerDependencies" fields', function () {
          beforeEach(function () {
            readPkgStub.resolves({
              optionalDependencies: {
                mocha: '10.1.0',
              },
              peerDependencies: {mocha: '^10.0.0'},
            });
          });

          it('should return the package and spec from the "optionalDependencies" field', async function () {
            await expect(
              pickPackageVersion('mocha'),
              'to be fulfilled with',
              'mocha@10.1.0',
            );
          });
        });

        describe('when the package appears in the local package.json in the "peerDependencies" field only', function () {
          beforeEach(function () {
            readPkgStub.resolves({
              peerDependencies: {mocha: '^10.0.0'},
            });
          });

          it('should return the package and spec from the "peerDependencies" field', async function () {
            await expect(
              pickPackageVersion('mocha'),
              'to be fulfilled with',
              'mocha@^10.0.0',
            );
          });
        });
      });
    });
  });
});
