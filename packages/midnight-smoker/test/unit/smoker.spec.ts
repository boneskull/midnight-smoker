import {InstallEvent, PackEvent, SmokerEvent} from '#event/event-constants';
import {type PkgManager} from '#pkg-manager';
import type * as PR from '#plugin/plugin-registry';
import {type InstallResult} from '#schema/install-result';
// import {NullPkgManagerController} from '@midnight-smoker/test-util/controller';
import {
  createExecaMock,
  type ExecaMock,
} from '@midnight-smoker/test-util/execa';
// import {NullPm} from '@midnight-smoker/test-util/pkg-manager';
import {registerRule} from '@midnight-smoker/test-util/register';
import {omit} from 'lodash';
import {type IFs} from 'memfs';
import os from 'node:os';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import {z} from 'zod';
import {PkgManagerController} from '../../src/controller';
import type * as MS from '../../src/smoker';
import * as Mocks from './mocks';
import {createFsMocks, type FsMocks} from './mocks/fs';

const expect = unexpected
  .clone()
  .use(unexpectedSinon)
  .use(unexpectedEventEmitter);

const MOCK_PM_ID = 'nullpm@1.0.0';

const {MOCK_TMPDIR} = Mocks;

interface SmokerSpecMocks extends FsMocks {
  'node:console': sinon.SinonStubbedInstance<typeof console>;
  debug?: Mocks.DebugMock;
  execa: ExecaMock;
}

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  let Smoker: typeof MS.Smoker;

  let mocks: SmokerSpecMocks;
  let nullPm: PkgManager;
  let PluginRegistry: typeof PR.PluginRegistry;
  let pkgManagerController: sinon.SinonStubbedInstance<PkgManagerController>;
  let fs: IFs;
  let rmStub: sinon.SinonStubbedMember<typeof fs.promises.rm>;
  let fsMocks: FsMocks;
  beforeEach(function () {
    sandbox = createSandbox();
    const execaMock = createExecaMock();
    ({mocks: fsMocks, fs} = createFsMocks());
    mocks = {
      ...fsMocks,
      execa: execaMock,
      'node:console': sandbox.stub(console),
      debug: Mocks.mockDebug,
    };
    rmStub = sandbox.stub(fs.promises, 'rm');

    // don't stub out debug statements if running in wallaby
    if (process.env.WALLABY) {
      delete mocks.debug;
    }

    ({Smoker} = rewiremock.proxy(() => require('../../src/smoker'), mocks));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Smoker', function () {
    describe('method', function () {
      let smoker: MS.Smoker;
      let registry: PR.PluginRegistry;

      beforeEach(async function () {
        registry = PluginRegistry.create();
        pkgManagerController = sandbox.createStubInstance(PkgManagerController);

        smoker = await Smoker.createWithCapabilities(
          {script: 'foo'},
          {
            pluginRegistry: registry,
            pkgManagerController: pkgManagerController,
          },
        );
      });

      describe('cleanup()', function () {
        describe('when a package manager has been loaded', function () {
          beforeEach(function () {
            pkgManagerController.pkgManagers;
          });
          it('should attempt to prune all temp dirs owned by loaded package managers', async function () {
            await smoker.cleanup();
            await expect(rmStub, 'was called once').and(
              'to have a call satisfying',
              [nullPm.tmpdir, {recursive: true, force: true}],
            );
          });

          describe('when it fails to prune the temp directory', function () {
            describe('when the failure is not due to the non-existence of the temp directory', function () {
              beforeEach(function () {
                const err = Object.assign(new Error('foo'), {code: 'DERP'});
                rmStub.rejects(err);
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
                rmStub.rejects(err);
              });

              it('should not reject', async function () {
                await expect(smoker.cleanup(), 'to be fulfilled');
              });
            });
          });
        });

        describe('when the "linger" option is true and a temp dir was created', function () {
          beforeEach(async function () {
            await fs.promises.mkdir(os.tmpdir(), {recursive: true});
            smoker = await Smoker.create({
              script: 'foo',
              linger: true,
            });
          });

          it('should not attempt to prune the temp directories', async function () {
            await smoker.cleanup();
            await expect(fs.promises.rm, 'was not called');
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
            pkgManagerController.pack.resolves(expectedManifest);
            actualManifest = await smoker.pack();
          });

          it('should delegate to the PkgManagerController', function () {
            expect(pkgManagerController.pack, 'was called once');
          });

          it('should subscribe to all relevant events', function () {
            expect(
              pkgManagerController.addListener,
              'was called times',
              packEvents.length,
            );
          });
          it('should unsubscribe from all relevant events', function () {
            expect(
              pkgManagerController.removeAllListeners,
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
            pkgManagerController.pack.rejects(new Error('yikes'));
            await expect(smoker.pack(), 'to be rejected');
          });

          it('should unsubscribe from all relevant events', function () {
            expect(
              pkgManagerController.removeAllListeners,
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
            pkgManagerController.install.resolves(expectedResult);
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
            expect(pkgManagerController.install, 'was called once');
          });

          it('should subscribe to all relevant events', function () {
            expect(
              pkgManagerController.addListener,
              'was called times',
              installEvents.length,
            );
          });
          it('should unsubscribe from all relevant events', function () {
            expect(
              pkgManagerController.removeAllListeners,
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
            pkgManagerController.install.rejects(new Error('yikes'));
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
              pkgManagerController.removeAllListeners,
              'was called times',
              installEvents.length,
            );
          });
        });
      });

      describe('smoke()', function () {
        beforeEach(async function () {
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

      describe('runChecks()', function () {
        let smoker: MS.Smoker;
        let registry: PR.PluginRegistry;
        let installResults: InstallResult[];

        beforeEach(async function () {
          registry = PluginRegistry.create();

          await registerRuleRunner(registry, nullRuleRunner, {
            pluginName: 'run-checks',
          });

          smoker = await Smoker.createWithCapabilities(
            {ruleRunner: 'run-checks/default'},
            {
              pluginRegistry: registry,
              pkgManagerController: sandbox.createStubInstance(
                NullPkgManagerController,
              ),
            },
          );

          installResults = [
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
        });

        it('should run enabled rules', async function () {
          const runRulesResult = await smoker.runChecks(installResults);
          const rules = registry.getRules();
          expect(runRulesResult, 'to satisfy', {
            issues: expect.it('to be empty'),
            passed: expect.it(
              'to have length',
              rules.length * installResults[0].installManifests.length,
            ),
          });
        });

        it('should throw an error if installPath is not provided for a package', async function () {
          installResults = installResults.map((result) => ({
            ...result,
            installManifests: result.installManifests.map((installManifest) =>
              omit(installManifest, 'installPath'),
            ),
          }));

          await expect(
            smoker.runChecks(installResults),
            'to be rejected with error satisfying',
            /Expected an installPath for/,
          );
        });

        it('should ignore additional dependencies', async function () {
          installResults = [
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
                  isAdditional: true,
                  spec: 'bar@1.0.0',
                  pkgName: 'bar',
                  cwd: MOCK_TMPDIR,
                  installPath: path.join(MOCK_TMPDIR, 'node_modules', 'bar'),
                },
              ],
            },
          ];

          const runRulesResult = await smoker.runChecks(installResults);
          const rules = registry.getRules();
          expect(runRulesResult, 'to satisfy', {
            issues: expect.it('to be empty'),
            passed: expect.it('to have length', rules.length),
          });
        });
      });
    });

    describe('static method', function () {
      let registry: PR.PluginRegistry;

      beforeEach(async function () {
        registry = PluginRegistry.create();
        await registerRule(registry, {
          name: 'test-rule',
          schema: z.object({foo: z.string().default('bar')}),
        });
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
              {pluginRegistry: registry},
            ),
            'to be rejected with error satisfying',
            /Option "workspace" is mutually exclusive with "all"/,
          );
        });

        describe('when not passed any scripts at all', function () {
          it('should not throw', async function () {
            await expect(
              Smoker.createWithCapabilities({}, {pluginRegistry: registry}),
              'to be fulfilled',
            );
          });
        });

        it('should return a Smoker instance', async function () {
          await expect(
            Smoker.createWithCapabilities({}, {pluginRegistry: registry}),
            'to be fulfilled with value satisfying',
            expect.it('to be a', Smoker),
          );
        });
      });
    });
  });
});
