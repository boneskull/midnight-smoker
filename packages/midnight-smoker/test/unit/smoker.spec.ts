import type {ExecaMock} from '@midnight-smoker/test-util';
import {
  NullPm,
  createExecaMock,
  registerRule,
} from '@midnight-smoker/test-util';
import type {mkdir, mkdtemp, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import z from 'zod';
import type {PkgManagerController} from '../../src/component/package-manager/controller';
import type {
  InstallResult,
  PkgManager,
  PkgManagerInstallManifest,
} from '../../src/component/schema/pkg-manager-schema';
import {
  InstallEvent,
  PackEvent,
  SmokerEvent,
} from '../../src/event/event-constants';
import {PluginRegistry} from '../../src/plugin/registry';
import type * as MS from '../../src/smoker';
import * as Mocks from './mocks';
import {NullPkgManagerController} from './mocks/null-pm-controller';

const expect = unexpected
  .clone()
  .use(unexpectedSinon)
  .use(unexpectedEventEmitter);

// TODO: replace this shit with memfs
interface NodeFsPromisesMocks {
  mkdir: sinon.SinonStubbedMember<typeof mkdir>;
  mkdtemp: sinon.SinonStubbedMember<typeof mkdtemp>;
  rm: sinon.SinonStubbedMember<typeof rm>;
  stat: sinon.SinonStubbedMember<typeof stat>;
}

const MOCK_PM_ID = 'nullpm@1.0.0';

const {MOCK_TMPDIR} = Mocks;

interface SmokerSpecMocks {
  'node:fs/promises': NodeFsPromisesMocks;
  'node:console': sinon.SinonStubbedInstance<typeof console>;
  debug?: Mocks.DebugMock;
  execa: ExecaMock;
  'read-pkg-up': sinon.SinonStub<
    any,
    Promise<{packageJson: {name: 'foo'}; path: '/some/path/to/package.json'}>
  >;
}

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  let Smoker: typeof MS.Smoker;

  let mocks: SmokerSpecMocks;

  let nullPm: NullPm;

  let pkgManagerMap: Map<string, PkgManager>;

  let pmController: sinon.SinonStubbedInstance<PkgManagerController>;

  beforeEach(function () {
    sandbox = createSandbox();
    pkgManagerMap = new Map();
    const execaMock = createExecaMock();
    mocks = {
      'node:fs/promises': {
        rm: sandbox.stub<Parameters<typeof rm>>().resolves(),
        mkdtemp: sandbox
          .stub<Parameters<typeof mkdtemp>>()
          .resolves(MOCK_TMPDIR),
        mkdir: sandbox.stub<Parameters<typeof mkdir>>().resolves(),
        stat: sandbox.stub<Parameters<typeof stat>>().rejects(),
      },
      execa: execaMock,
      'node:console': sandbox.stub(console),
      debug: Mocks.mockDebug,
      'read-pkg-up': sandbox.stub().returns({
        packageJson: {name: 'foo'},
        path: '/some/path/to/package.json',
      }),
    };

    // don't stub out debug statements if running in wallaby
    if (process.env.WALLABY_PROJECT_DIR) {
      delete mocks.debug;
    }

    nullPm = new NullPm(MOCK_PM_ID);
    pkgManagerMap.set(MOCK_PM_ID, nullPm);

    ({Smoker} = rewiremock.proxy(() => require('../../src/smoker'), mocks));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Smoker', function () {
    describe('method', function () {
      let smoker: MS.Smoker;
      let registry: PluginRegistry;

      beforeEach(async function () {
        registry = PluginRegistry.create();
        pmController = sandbox.createStubInstance(NullPkgManagerController);
        // sandbox.stub(registry, 'loadPackageManagers').resolves(pkgManagerMap);

        smoker = await Smoker.createWithCapabilities(
          {script: 'foo'},
          {registry, pmController},
        );
      });

      describe('cleanup()', function () {
        describe('when a package manager has been loaded', function () {
          beforeEach(function () {
            pmController.getPkgManagers.resolves([nullPm]);
          });
          it('should attempt to prune all temp dirs owned by loaded package managers', async function () {
            await smoker.cleanup();
            await expect(mocks['node:fs/promises'].rm, 'was called once').and(
              'to have a call satisfying',
              [nullPm.tmpdir, {recursive: true, force: true}],
            );
          });

          describe('when it fails to prune the temp directory', function () {
            describe('when the failure is not due to the non-existence of the temp directory', function () {
              beforeEach(function () {
                const err = Object.assign(new Error('foo'), {code: 'DERP'});
                mocks['node:fs/promises'].rm.rejects(err);
              });

              it('should reject', async function () {
                await expect(
                  smoker.cleanup(),
                  'to be rejected with error satisfying',
                  /Failed to clean temp directory/,
                );
              });
            });

            describe('when the failure is due to the non-existence of the temp directory', function () {
              beforeEach(function () {
                const err: NodeJS.ErrnoException = new Error();
                err.code = 'ENOENT';
                mocks['node:fs/promises'].rm.rejects(err);
              });

              it('should not reject', async function () {
                await expect(smoker.cleanup(), 'to be fulfilled');
              });
            });
          });
        });

        describe('when the "linger" option is true and a temp dir was created', function () {
          beforeEach(async function () {
            registry = PluginRegistry.create();
            smoker = await Smoker.createWithCapabilities(
              {script: 'foo', linger: true},
              {registry},
            );
          });

          it('should not attempt to prune the temp directories', async function () {
            await smoker.cleanup();
            await expect(mocks['node:fs/promises'].rm, 'was not called');
          });

          it('should emit the "Lingered" event', async function () {
            await expect(
              smoker.cleanup(),
              'to emit from',
              smoker,
              SmokerEvent.Lingered,
            );
          });
        });
      });

      describe('pack()', function () {
        const packEvents = Object.keys(PackEvent);

        describe('when packing succeeds', function () {
          let actualManifest: PkgManagerInstallManifest[];
          const expectedManifest = [
            {
              pkgManager: nullPm,
              spec: `${MOCK_TMPDIR}/bar.tgz`,
              pkgName: 'bar',
              cwd: MOCK_TMPDIR,
              isAdditional: false,
            },
          ];
          beforeEach(async function () {
            pmController.pack.resolves(expectedManifest);
            actualManifest = await smoker.pack();
          });

          it('should delegate to the PkgManagerController', function () {
            expect(pmController.pack, 'was called once');
          });

          it('should subscribe to all relevant events', function () {
            expect(
              pmController.addListener,
              'was called times',
              packEvents.length,
            );
          });
          it('should unsubscribe from all relevant events', function () {
            expect(
              pmController.removeAllListeners,
              'was called times',
              packEvents.length,
            );
          });

          it('should return the result of PkgManagerController.pack()', async function () {
            expect(actualManifest, 'to be', expectedManifest);
          });
        });

        describe('when packing fails', function () {
          beforeEach(async function () {
            pmController.pack.rejects(new Error('yikes'));
            await expect(smoker.pack(), 'to be rejected');
          });

          it('should unsubscribe from all relevant events', function () {
            expect(
              pmController.removeAllListeners,
              'was called times',
              packEvents.length,
            );
          });
        });
      });

      describe('install()', function () {
        const installEvents = Object.keys(InstallEvent);

        describe('when installation succeeds', function () {
          let actualResult: InstallResult[];
          const expectedResult: InstallResult[] = [
            {
              rawResult: {} as any,
              installManifests: [
                {
                  pkgManager: nullPm,
                  isAdditional: false,
                  spec: 'foo@1.0.0',
                  pkgName: 'foo',
                  cwd: MOCK_TMPDIR,
                  installPath: path.join(MOCK_TMPDIR, 'node_modules', 'foo'),
                },
                {
                  pkgManager: nullPm,
                  isAdditional: false,
                  spec: 'bar@1.0.0',
                  pkgName: 'bar',
                  cwd: MOCK_TMPDIR,
                  installPath: path.join(MOCK_TMPDIR, 'node_modules', 'bar'),
                },
              ],
            },
          ];
          beforeEach(async function () {
            pmController.install.resolves(expectedResult);
            actualResult = await smoker.install([
              {
                pkgManager: nullPm,
                spec: `${MOCK_TMPDIR}/bar.tgz`,
                pkgName: 'bar',
                cwd: MOCK_TMPDIR,
                isAdditional: false,
              },
            ]);
          });

          it('should delegate to the PkgManagerController', function () {
            expect(pmController.install, 'was called once');
          });

          it('should subscribe to all relevant events', function () {
            expect(
              pmController.addListener,
              'was called times',
              installEvents.length,
            );
          });
          it('should unsubscribe from all relevant events', function () {
            expect(
              pmController.removeAllListeners,
              'was called times',
              installEvents.length,
            );
          });

          it('should return the result of PkgManagerController.pack()', async function () {
            expect(actualResult, 'to be', expectedResult);
          });
        });

        describe('when installation fails', function () {
          beforeEach(async function () {
            pmController.install.rejects(new Error('yikes'));
            await expect(
              smoker.install([
                {
                  pkgManager: nullPm,
                  spec: `${MOCK_TMPDIR}/bar.tgz`,
                  pkgName: 'bar',
                  cwd: MOCK_TMPDIR,
                  isAdditional: false,
                },
              ]),
              'to be rejected',
            );
          });

          it('should unsubscribe from all relevant events', function () {
            expect(
              pmController.removeAllListeners,
              'was called times',
              installEvents.length,
            );
          });
        });
      });

      describe('smoke()', function () {
        beforeEach(async function () {
          sandbox.stub(smoker, 'loadListeners').resolves();
          sandbox.stub(smoker, 'runScripts').resolves([]);
          sandbox.stub(smoker, 'runChecks').resolves({passed: [], issues: []});
          sandbox.stub(smoker, 'pack').resolves([]);
          sandbox.stub(smoker, 'install').resolves([]);
          await smoker.smoke();
        });

        it('should install packages', function () {
          expect(smoker.pack, 'was called once');
        });

        it('should pack packages', function () {
          expect(smoker.pack, 'was called once');
        });

        describe('when provided scripts', function () {
          it('should run scripts', function () {
            expect(smoker.runScripts, 'was called once');
          });
        });

        describe('when checks enabled', function () {
          it('it should run checks', function () {
            expect(smoker.runChecks, 'was called once');
          });
        });
      });
    });

    describe('static method', function () {
      let registry: PluginRegistry;

      beforeEach(async function () {
        registry = PluginRegistry.create();
        await registerRule(
          {
            name: 'test-rule',
            schema: z.object({foo: z.string().default('bar')}),
          },
          registry,
        );
        sandbox.stub(registry, 'loadPlugins').resolves(registry);
      });

      describe('smoke()', function () {
        let smokerStub: sinon.SinonStubbedInstance<MS.Smoker>;

        beforeEach(async function () {
          smokerStub = sandbox.createStubInstance(Smoker);
          sandbox.stub(Smoker, 'create').resolves(smokerStub);
          await Smoker.smoke({script: 'foo'});
        });

        it('should delegate to Smoker.create()', async function () {
          expect(Smoker.create, 'was called once');
        });

        it('should delegate to Smoker.prototype.smoke()', async function () {
          expect(smokerStub.smoke, 'was called once');
        });
      });

      describe('create()', function () {
        it('should throw if both non-empty "workspace" and true "all" options are provided', async function () {
          await expect(
            Smoker.create({workspace: ['foo'], all: true}),
            'to be rejected with error satisfying',
            /Option "workspace" is mutually exclusive with "all"/,
          );
        });

        describe('when not passed any scripts at all', function () {
          it('should not throw', async function () {
            await expect(Smoker.create({}), 'to be fulfilled');
          });
        });

        it('should return a Smoker instance', async function () {
          await expect(
            Smoker.create({}),
            'to be fulfilled with value satisfying',
            expect.it('to be a', Smoker),
          );
        });
      });

      describe('createWithCapabilities()', function () {
        it('should throw if both non-empty "workspace" and true "all" options are provided', async function () {
          await expect(
            Smoker.createWithCapabilities(
              {workspace: ['foo'], all: true},
              {registry},
            ),
            'to be rejected with error satisfying',
            /Option "workspace" is mutually exclusive with "all"/,
          );
        });

        describe('when not passed any scripts at all', function () {
          it('should not throw', async function () {
            await expect(
              Smoker.createWithCapabilities({}, {registry}),
              'to be fulfilled',
            );
          });
        });

        it('should return a Smoker instance', async function () {
          await expect(
            Smoker.createWithCapabilities({}, {registry}),
            'to be fulfilled with value satisfying',
            expect.it('to be a', Smoker),
          );
        });
      });
    });
  });
});
