import {type Executor} from 'midnight-smoker/defs/executor';
import {
  type PkgManagerInstallContext,
  PkgManagerSpec,
  type StaticPkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

import {Npm9} from '../../../src/package-manager/npm9';

const expect = unexpected.clone().use(unexpectedSinon);

const MOCK_TMPDIR = '/some/dir';

describe('@midnight-smoker/plugin-default', function () {
  let sandbox: sinon.SinonSandbox;
  let executor: sinon.SinonStubbedMember<Executor>;

  beforeEach(function () {
    sandbox = createSandbox();

    executor = sandbox.stub();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('package manager', function () {
    describe('Npm9', function () {
      let spec: StaticPkgManagerSpec;

      before(function () {
        spec = PkgManagerSpec.create('npm@9.8.1').toJSON();
      });

      describe('instance method', function () {
        describe('install()', function () {
          let ctx: PkgManagerInstallContext;

          beforeEach(function () {
            ctx = {
              executor,
              installManifest: {
                cwd: MOCK_TMPDIR,
                installPath: `${MOCK_TMPDIR}/node_modules/bar`,
                pkgName: 'bar',
                pkgSpec: `${MOCK_TMPDIR}/bar.tgz`,
              },
              signal: new AbortController().signal,
              spec,
              tmpdir: MOCK_TMPDIR,
              workspaces: [],
            };
            executor.resolves({exitCode: 0, stdout: 'stuff'} as any);
          });

          it('should call Npm9 with "--install-strategy=shallow"', async function () {
            await Npm9.install(ctx);
            expect(executor, 'to have a call satisfying', [
              spec,
              [
                'install',
                ctx.installManifest.pkgSpec,
                '--no-audit',
                '--no-package-lock',
                '--install-strategy=shallow',
                '--json',
              ],
              {nodeOptions: {cwd: '/some/dir'}},
            ]);
          });
        });
      });
    });
  });
});
