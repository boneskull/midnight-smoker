import type {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';
import unexpected from 'unexpected';
import type * as _Util from '../../src/util';

const expect = unexpected.clone();
const MOCK_TMPROOT = '/some/tmp';
const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

describe('midnight-smoker', function () {
  let Util: typeof _Util;
  let readPkgUpStub: sinon.SinonStub;
  let sandbox: sinon.SinonSandbox;
  let mkdtempStub: sinon.SinonStubbedMember<typeof mkdtemp>;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    readPkgUpStub = sinon.stub().resolves({
      packageJson: {
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
      },
    });
    mkdtempStub = sandbox
      .stub<Parameters<typeof mkdtemp>>()
      .resolves(MOCK_TMPDIR);
    Util = rewiremock.proxy(() => require('../../src/util'), {
      'node:fs/promises': {
        mkdtemp: mkdtempStub,
      },
      'read-pkg-up': readPkgUpStub,
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('util', function () {
    describe('pickPackageVersion()', function () {
      describe('when provided a package name and spec', function () {
        it('should return the package name and spec', async function () {
          await expect(
            Util.pickPackageVersion('foo@1.0.0'),
            'to be fulfilled with',
            'foo@1.0.0',
          );
        });
      });

      describe('when provided a url to a git repo', function () {
        it('should return the url', async function () {
          await expect(
            Util.pickPackageVersion(
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
              Util.pickPackageVersion('foo'),
              'to be fulfilled with',
              'foo@latest',
            );
          });
        });

        describe('when the package appears in the local package.json in the "devDependencies" and "peerDependencies" fields', function () {
          it('should return the package and spec from the "devDependencies" field', async function () {
            await expect(
              Util.pickPackageVersion('mocha'),
              'to be fulfilled with',
              'mocha@10.2.0',
            );
          });
        });

        describe('when the package appears in the local package.json in the "dependencies" and "peerDependencies" fields', function () {
          beforeEach(function () {
            readPkgUpStub.resolves({
              packageJson: {
                dependencies: {
                  mocha: '10.0.0',
                },
                optionalDependencies: {
                  mocha: '10.1.0',
                },
                peerDependencies: {mocha: '^10.0.0'},
              },
            });
          });

          it('should return the package and spec from the "dependencies" field', async function () {
            await expect(
              Util.pickPackageVersion('mocha'),
              'to be fulfilled with',
              'mocha@10.0.0',
            );
          });
        });

        describe('when the package appears in the local package.json in the "optionalDependencies" and "peerDependencies" fields', function () {
          beforeEach(function () {
            readPkgUpStub.resolves({
              packageJson: {
                optionalDependencies: {
                  mocha: '10.1.0',
                },
                peerDependencies: {mocha: '^10.0.0'},
              },
            });
          });

          it('should return the package and spec from the "optionalDependencies" field', async function () {
            await expect(
              Util.pickPackageVersion('mocha'),
              'to be fulfilled with',
              'mocha@10.1.0',
            );
          });
        });

        describe('when the package appears in the local package.json in the "peerDependencies" field only', function () {
          beforeEach(function () {
            readPkgUpStub.resolves({
              packageJson: {
                peerDependencies: {mocha: '^10.0.0'},
              },
            });
          });

          it('should return the package and spec from the "peerDependencies" field', async function () {
            await expect(
              Util.pickPackageVersion('mocha'),
              'to be fulfilled with',
              'mocha@^10.0.0',
            );
          });
        });
      });
    });
  });
});
