import type {nullExecutor} from '@midnight-smoker/test-util';
import {
  PkgManagerSpec,
  type PkgManagerInstallContext,
} from 'midnight-smoker/pkg-manager';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import type * as NPM9 from '../../../src/package-manager/npm9';
import type {ConsoleMock, DebugMock} from '../../mocks';
import {mockConsole, mockDebug} from '../../mocks';

const expect = unexpected.clone().use(unexpectedSinon);

const MOCK_TMPDIR = '/some/dir';

interface Npm9SpecMocks {
  'node:console': ConsoleMock;
  debug?: DebugMock;
}

describe('@midnight-smoker/plugin-default', function () {
  let sandbox: sinon.SinonSandbox;
  let executor: sinon.SinonStubbedMember<typeof nullExecutor>;
  let mocks: Npm9SpecMocks;

  let Npm9: typeof NPM9.Npm9;
  beforeEach(function () {
    sandbox = createSandbox();

    executor = sandbox.stub();

    // sandbox.stub(Helpers, 'createTempDir').resolves(MOCK_TMPDIR);

    mocks = {
      'node:console': mockConsole,
      debug: mockDebug,
    };

    // don't stub out debug statements if running in wallaby
    if (process.env.WALLABY) {
      delete mocks.debug;
    }

    ({Npm9} = rewiremock.proxy(
      () => require('../../../src/package-manager/npm9'),
      mocks,
    ));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('package manager', function () {
    describe('Npm9', function () {
      let spec: Readonly<PkgManagerSpec>;

      before(async function () {
        spec = await PkgManagerSpec.from('npm@9.8.1');
      });

      describe('instance method', function () {
        let npm: NPM9.Npm9;

        beforeEach(async function () {
          npm = new Npm9();
        });

        describe('accepts', function () {
          it('should return false for versions < 9.0.0', function () {
            expect(npm.accepts('8.0.0'), 'to be false');
          });

          it('should return true for versions >= 9.0.0', function () {
            expect(npm.accepts('9.0.0'), 'to be true');
          });

          it('should return true for versions >= 10.0.0', function () {
            expect(npm.accepts('10.0.0'), 'to be true');
          });
        });

        describe('install()', function () {
          let ctx: PkgManagerInstallContext;

          beforeEach(function () {
            ctx = {
              signal: new AbortController().signal,
              spec,
              tmpdir: MOCK_TMPDIR,
              executor,
              installManifests: [
                {
                  pkgSpec: `${MOCK_TMPDIR}/bar.tgz`,
                  pkgName: 'bar',
                  cwd: MOCK_TMPDIR,
                  installPath: `${MOCK_TMPDIR}/node_modules/bar`,
                },
                {
                  pkgSpec: `${MOCK_TMPDIR}/baz.tgz`,
                  pkgName: 'baz',
                  cwd: MOCK_TMPDIR,
                  installPath: `${MOCK_TMPDIR}/node_modules/baz`,
                },
              ],
            };
            executor.resolves({stdout: 'stuff', exitCode: 0} as any);
          });

          it('should call npm with "--install-strategy=shallow"', async function () {
            await npm.install(ctx);
            expect(executor, 'to have a call satisfying', [
              spec,
              [
                'install',
                '--no-audit',
                '--no-package-lock',
                '--install-strategy=shallow',
                '--json',
                ...ctx.installManifests.map(({pkgSpec}) => pkgSpec),
              ],
              {},
              {cwd: '/some/dir'},
            ]);
          });
        });
      });
    });
  });
});
