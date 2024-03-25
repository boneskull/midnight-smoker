import {DEFAULT_PKG_MANAGER_BIN, DEFAULT_PKG_MANAGER_VERSION} from '#constants';
import {type getSystemPkgManagerVersion} from '#util/pkg-util';
import {nullPmDef} from '@midnight-smoker/test-util';
import {globIterate} from 'glob';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import type * as G from '../../../../dist/component/pkg-manager/pkg-manager-oracle';
import {createFsMocks, type FsMocks} from '../../mocks/fs';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('guessPackageManager()', function () {
        const SYSTEM_PKG_MANAGER_VERSION = '1.0.1';

        let sandbox: sinon.SinonSandbox;
        let guessPackageManager: typeof G.guessPackageManager;
        let getSystemPkgManagerVersionStub: sinon.SinonStubbedMember<
          typeof getSystemPkgManagerVersion
        >;
        let fs: FsMocks['fs'];
        beforeEach(function () {
          sandbox = createSandbox();
          let mocks: FsMocks;
          ({mocks, fs} = createFsMocks());
          getSystemPkgManagerVersionStub = sandbox
            .stub<[string], Promise<string>>()
            .resolves(SYSTEM_PKG_MANAGER_VERSION);

          const globIterateWrapper = ((patterns, opts) => {
            return globIterate(patterns, {...opts, fs: fs as any});
          }) as typeof globIterate;

          ({guessPackageManager} = rewiremock.proxy(
            () =>
              require('../../../../src/component/pkg-manager/pkg-manager-guesser'),
            (r) => ({
              ...mocks,
              'read-pkg-up': sandbox.stub().callsFake(async ({cwd = '/'}) => {
                const filepath = path.join(cwd, 'package.json');
                return fs.promises.readFile(filepath, 'utf8').then((data) => ({
                  path: filepath,
                  packageJson: JSON.parse(`${data}`),
                }));
              }),
              '#util/pkg-util': r
                .with({
                  getSystemPkgManagerVersion: getSystemPkgManagerVersionStub,
                })
                .callThrough(),
              glob: {
                globIterate: globIterateWrapper,
              },
            }),
          ));
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('when the nearest package.json contains a packageManager field', function () {
          beforeEach(async function () {
            await fs.promises.writeFile(
              path.normalize('/package.json'),
              JSON.stringify({packageManager: 'nullpm@1.0.0'}),
            );
          });

          it('should pick the package manager from the packageManager field', async function () {
            await expect(
              guessPackageManager([], '/'),
              'to be fulfilled with value satisfying',
              {
                pkgManager: 'nullpm',
                version: '1.0.0',
                isSystem: false,
              },
            );
          });
        });

        describe('when the cwd contains a package-manager-specific lockfile', function () {
          beforeEach(async function () {
            await fs.promises.writeFile(
              path.normalize('/package.json'),
              JSON.stringify({}),
            );
            await fs.promises.writeFile(
              path.normalize(`/${nullPmDef.lockfile}`),
              '',
            );
            expect(nullPmDef.lockfile, 'to be a string');
          });

          it('should pick the package manager based on the lockfile', async function () {
            await expect(
              guessPackageManager([nullPmDef], '/'),
              'to be fulfilled with value satisfying',
              {
                pkgManager: nullPmDef.bin,
                version: SYSTEM_PKG_MANAGER_VERSION,
                isSystem: true,
              },
            );
          });
        });

        describe('when no lockfile nor packageManager field is found', function () {
          beforeEach(async function () {
            await fs.promises.writeFile(
              path.normalize('/package.json'),
              JSON.stringify({}),
            );
          });
          it('should resolve with the default package manager', async function () {
            await expect(
              guessPackageManager([], '/'),
              'to be fulfilled with value satisfying',
              {
                pkgManager: DEFAULT_PKG_MANAGER_BIN,
                version: DEFAULT_PKG_MANAGER_VERSION,
                isSystem: false,
              },
            );
          });
        });
      });
    });
  });
});
