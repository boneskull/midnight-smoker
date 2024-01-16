import type {nullExecutor} from '@midnight-smoker/test-util';
import {Helpers, PkgManager as PkgMgr} from 'midnight-smoker/plugin';
import rewiremock from 'rewiremock/node';
import {Range} from 'semver';
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
  let executor: sinon.SinonStubbedMember<typeof nullExecutor> &
    typeof nullExecutor;
  let mocks: Npm9SpecMocks;

  let Npm9: typeof NPM9.Npm9;
  beforeEach(function () {
    sandbox = createSandbox();

    executor = sandbox.stub() as typeof executor;

    sandbox.stub(Helpers, 'createTempDir').resolves(MOCK_TMPDIR);

    mocks = {
      'node:console': mockConsole,
      debug: mockDebug,
    };

    // don't stub out debug statements if running in wallaby
    if (process.env.WALLABY_PROJECT_DIR) {
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
      let spec: Readonly<PkgMgr.PkgManagerSpec>;

      before(async function () {
        spec = await PkgMgr.PkgManagerSpec.from('npm@9.8.1');
      });

      describe('static method', function () {
        describe('accepts', function () {
          let range: Range;

          beforeEach(function () {
            range = new Range(Npm9.accepts);
          });

          it('should return false for versions < 9.0.0', function () {
            expect(range.test('8.0.0'), 'to be false');
          });

          it('should return true for versions >= 9.0.0', function () {
            expect(range.test('9.0.0'), 'to be true');
          });

          it('should return true for versions >= 10.0.0', function () {
            expect(range.test('10.0.0'), 'to be true');
          });
        });
      });
      describe('instance method', function () {
        let npm: NPM9.Npm9;

        beforeEach(async function () {
          npm = await Npm9.create(spec, executor, Helpers);
        });

        describe('install()', function () {
          const manifest: PkgMgr.InstallManifest[] = [
            {
              spec: `${MOCK_TMPDIR}/bar.tgz`,
              pkgName: 'bar',
              cwd: MOCK_TMPDIR,
              installPath: `${MOCK_TMPDIR}/node_modules/bar`,
            },
            {
              spec: `${MOCK_TMPDIR}/baz.tgz`,
              pkgName: 'baz',
              cwd: MOCK_TMPDIR,
              installPath: `${MOCK_TMPDIR}/node_modules/baz`,
            },
          ];

          beforeEach(function () {
            executor.resolves({stdout: 'stuff', exitCode: 0} as any);
          });

          it('should call npm with "--install-strategy=shallow"', async function () {
            await npm.install(manifest);
            expect(executor, 'to have a call satisfying', [
              npm.spec,
              [
                'install',
                '--no-audit',
                '--no-package-lock',
                '--install-strategy=shallow',
                '--json',
                ...manifest.map(({spec}) => spec),
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
