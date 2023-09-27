import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {CorepackExecutor} from '../../../src/pm/corepack';
import type * as NPM9 from '../../../src/pm/npm9';
import {InstallManifest} from '../../../src/types';
import * as Mocks from '../mocks';

const expect = unexpected.clone().use(unexpectedSinon);

interface Npm9SpecMocks {
  'node:console': Mocks.ConsoleMock;
  debug: Mocks.DebugMock;
}

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  let mocks: Npm9SpecMocks;

  let Npm9: typeof NPM9.Npm9;
  let executor: sinon.SinonStubbedInstance<CorepackExecutor>;
  let execStub: sinon.SinonStubbedMember<CorepackExecutor['exec']>;

  beforeEach(function () {
    sandbox = createSandbox();

    execStub = sandbox
      .stub<
        Parameters<CorepackExecutor['exec']>,
        ReturnType<CorepackExecutor['exec']>
      >()
      .resolves({} as any);

    mocks = {
      'node:console': sandbox.stub(console) as Mocks.ConsoleMock,
      debug: sandbox.stub().returns(sandbox.stub()) as Mocks.DebugMock,
    };

    executor = sandbox.createStubInstance(CorepackExecutor, {
      exec: execStub,
    });

    ({Npm9} = rewiremock.proxy(() => require('../../../src/pm/npm9'), mocks));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('package manager', function () {
    describe('Npm9', function () {
      describe('method', function () {
        let npm: NPM9.Npm9;

        beforeEach(function () {
          npm = new Npm9(executor);
        });

        describe('install()', function () {
          const manifest: InstallManifest = {
            packedPkgs: [
              {
                tarballFilepath: `/some/dir/tubby-3.2.1.tgz`,
                installPath: `/some/dir/node_modules/tubby`,
                pkgName: 'tubby',
              },
              {
                tarballFilepath: `/some/dir/scrubby-1.2.3.tgz`,
                installPath: `/some/dir/node_modules/scrubby`,
                pkgName: 'scrubby',
              },
            ],
            tarballRootDir: '/some/dir',
          };

          beforeEach(function () {
            execStub.resolves({stdout: 'stuff'} as any);
          });

          it('should call npm with "--install-strategy=shallow', async function () {
            await npm.install(manifest);
            expect(execStub, 'to have a call satisfying', [
              [
                'install',
                '--no-package-lock',
                '--install-strategy=shallow',
                ...manifest.packedPkgs.map((pkg) => pkg.tarballFilepath),
              ],
              {cwd: '/some/dir'},
            ]);
          });
        });
      });
    });
  });
});
