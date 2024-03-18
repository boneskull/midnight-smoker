import {ComponentKinds, MIDNIGHT_SMOKER} from '#constants';
import type * as PMC from '#controller/pkg-manager-controller';
import {ErrorCodes} from '#error';
import {EventBus, SmokerEvent, type SmokerEventBus} from '#event';
import {
  InstallError,
  PackError,
  PackParseError,
  PkgManager,
  PkgManagerSpec,
  ScriptFailedError,
  type InstallManifest,
  type PkgManagerContext,
  type RunScriptResult,
  type SomePkgManager,
} from '#pkg-manager';
import {PluginMetadata, PluginRegistry} from '#plugin';
import {nullExecutor, nullPmDef} from '@midnight-smoker/test-util';
import {type FsPromisesApi} from 'memfs/lib/node/types';
import {type Volume} from 'memfs/lib/volume';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {
  createSandbox,
  type SinonSandbox,
  type SinonStubbedInstance,
  type SinonStubbedMember,
} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {MOCK_TMPROOT, createFsMocks} from '../mocks';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('controller', function () {
    describe('PkgManagerController', function () {
      // let PkgManagerSpec: typeof PkgMgr.PkgManagerSpec;
      let sandbox: SinonSandbox;
      let registry: SinonStubbedInstance<PluginRegistry>;
      let PkgManagerController: typeof PMC.PkgManagerController;
      let eventBus: SmokerEventBus;
      let fs: FsPromisesApi;
      let vol: Volume;
      let plugin: SinonStubbedInstance<PluginMetadata>;

      beforeEach(function () {
        sandbox = createSandbox();
        plugin = sandbox.createStubInstance(PluginMetadata);
        plugin.loadPkgManagers.resolves([
          {
            def: nullPmDef,
            spec: sandbox.createStubInstance(PkgManagerSpec),
          },
        ]);
        registry = Object.assign(sandbox.createStubInstance(PluginRegistry), {
          pluginMap: new Map([['@midnight-smoker/plugin-default', plugin]]),
        });
        registry.getComponent.returns({
          id: 'nullpm',
          componentName: 'nullpm',
          pluginName: '@midnight-smoker/plugin-default',
          kind: ComponentKinds.PkgManager,
          isBlessed: true,
          plugin: {} as any,
        });
        eventBus = sandbox.createStubInstance(EventBus);
        ({
          vol: {promises: fs},
          vol,
        } = createFsMocks());

        // note: could be mocking the PluginRegistry and EventBus instead.
        // we don't need FsMocks because of the presence of the FileManager
        ({PkgManagerController} = rewiremock.proxy(() =>
          require('../../../src/controller/pkg-manager-controller'),
        ));
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('constructor', function () {
        let ctrl: PMC.PkgManagerController;

        beforeEach(function () {
          registry.getExecutor.returns(nullExecutor);
          ctrl = new PkgManagerController(registry, eventBus, [], {
            verbose: true,
          });
        });

        it('should return a PkgManagerController', function () {
          expect(ctrl, 'to be a', PkgManagerController);
        });

        it('should set the default executor', function () {
          expect(ctrl.defaultExecutor, 'to be', nullExecutor);
        });

        it('should set the system executor', function () {
          expect(ctrl.systemExecutor, 'to be', nullExecutor);
        });

        it('should set the cwd', function () {
          expect(ctrl.cwd, 'to be', process.cwd());
        });

        it('should set pkgManagerOpts', function () {
          expect(ctrl.pkgManagerOpts, 'to equal', {verbose: true});
        });
      });

      describe('computed property', function () {
        let ctrl: PMC.PkgManagerController;

        beforeEach(function () {
          ctrl = new PkgManagerController(registry, eventBus, [], {});
        });

        describe('pkgManagers', function () {
          it('should return an array', function () {
            expect(ctrl.pkgManagers, 'to be an array');
          });
        });
      });

      describe('static method', function () {
        describe('create()', function () {
          it('should instantiate a new PkgManagerController', function () {
            expect(
              PkgManagerController.create(registry, eventBus, [], {}),
              'to be a',
              PkgManagerController,
            );
          });
        });
      });

      describe('instance method', function () {
        let ctrl: PMC.PkgManagerController;

        beforeEach(function () {
          registry.getExecutor.returns(nullExecutor);
          ctrl = PkgManagerController.create(registry, eventBus, [], {
            fileManagerOpts: {
              fs: fs as any,
              tmpdir: () => MOCK_TMPROOT,
            },
          });
        });

        describe('createPkgManagerContext()', function () {
          describe('if no spec is provided', function () {
            it('should reject', async function () {
              // @ts-expect-error bad type
              await expect(ctrl.createPkgManagerContext(), 'to be rejected');
            });
          });

          it('should resolve with a PkgManagerContext optionally containing PkgManagerOpts', async function () {
            await expect(
              ctrl.createPkgManagerContext({isSystem: true} as PkgManagerSpec, {
                verbose: true,
                loose: true,
              }),
              'to be fulfilled with value satisfying',
              {
                spec: {isSystem: true},
                tmpdir: expect.it('to start with', MOCK_TMPROOT),
                executor: nullExecutor,
                verbose: true,
                loose: true,
              },
            );
          });

          it('should return a PkgManagerContext containing a "tmpdir" prop', async function () {
            await expect(
              ctrl.createPkgManagerContext(
                {
                  isSystem: true,
                  pkgManager: 'nullpm',
                  version: '1.0.0',
                } as PkgManagerSpec,
                {
                  verbose: true,
                  loose: true,
                },
              ),
              'to be fulfilled with value satisfying',
              {
                tmpdir: expect.it(
                  'to start with',
                  path.join(MOCK_TMPROOT, MIDNIGHT_SMOKER, 'nullpm-1.0.0'),
                ),
              },
            );
          });

          it('should create a temp dir', async function () {
            const {tmpdir} = await ctrl.createPkgManagerContext(
              {
                isSystem: true,
                pkgManager: 'nullpm',
                version: '1.0.0',
              } as PkgManagerSpec,
              {
                verbose: true,
                loose: true,
              },
            );
            await expect(fs.stat(tmpdir), 'to be fulfilled');
          });
        });

        describe('destroy()', function () {
          let rmStub: SinonStubbedMember<typeof fs.rm>;
          let pkgManager: PkgManager;

          beforeEach(function () {
            rmStub = sandbox.stub(fs, 'rm');
            pkgManager = PkgManager.create('nullpm', nullPmDef, plugin, {
              tmpdir: path.join(
                MOCK_TMPROOT,
                MIDNIGHT_SMOKER,
                'nullpm-1.0.0',
                'asdf',
              ),
            } as PkgManagerContext);
            sandbox.replaceGetter(ctrl, 'pkgManagers', () => [pkgManager]);
          });

          describe('when a package manager has been loaded', function () {
            beforeEach(async function () {
              await ctrl.init();
              expect(vol.toJSON(), 'not to be empty');
            });

            it('should attempt to prune all temp dirs owned by loaded package managers', async function () {
              await ctrl.destroy();

              expect(fs.rm, 'was called once').and(
                'to have a call satisfying',
                [pkgManager.tmpdir, {recursive: true, force: true}],
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
                    ctrl.destroy(),
                    'to be rejected with error satisfying',
                    /Failed to clean temp directory/,
                  );
                });
              });

              describe('when the failure is due to the non-existence of the temp directory', function () {
                beforeEach(function () {
                  const err: NodeJS.ErrnoException = new Error();
                  err.code = 'ENOENT';
                });

                it('should not reject', async function () {
                  await expect(ctrl.destroy(), 'to be fulfilled');
                });
              });
            });
          });

          describe('when the "linger" option is true and a temp dir was created', function () {
            beforeEach(async function () {
              ctrl = PkgManagerController.create(registry, eventBus, [], {
                fileManagerOpts: {
                  fs: fs as any,
                  tmpdir: () => MOCK_TMPROOT,
                },
                linger: true,
              });
              sandbox.replaceGetter(ctrl, 'pkgManagers', () => [pkgManager]);
              await ctrl.destroy();
            });

            it('should not attempt to prune the temp directories', async function () {
              expect(rmStub, 'was not called');
            });

            it('should emit the "Lingered" event', function () {
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.Lingered,
                {directories: [pkgManager.tmpdir]},
              ]);
            });
          });
        });

        describe('runScripts()', function () {
          const scripts = ['script1', 'script2'];
          let opts: PMC.PkgManagerControllerRunScriptsOpts;
          let pkgManager: SomePkgManager;

          beforeEach(async function () {
            opts = {};
            pkgManager = PkgManager.create('nullpm', nullPmDef, plugin, {
              tmpdir: path.join(
                MOCK_TMPROOT,
                MIDNIGHT_SMOKER,
                'nullpm-1.0.0',
                'asdf',
              ),
              spec: await PkgManagerSpec.from('nullpm@1.0.0'),
            } as PkgManagerContext);
            sandbox.replaceGetter(ctrl, 'pkgManagers', () => [pkgManager]);
            sandbox.replaceGetter(
              pkgManager,
              'installManifests',
              () =>
                <InstallManifest[]>[
                  {
                    isAdditional: false,
                    pkgSpec: 'foo@1.0.0',
                    pkgName: 'foo',
                    cwd: MOCK_TMPROOT,
                    installPath: path.join(MOCK_TMPROOT, 'node_modules', 'foo'),
                  },
                  {
                    isAdditional: false,
                    pkgSpec: 'bar@1.0.0',
                    pkgName: 'bar',
                    cwd: MOCK_TMPROOT,
                    installPath: path.join(MOCK_TMPROOT, 'node_modules', 'bar'),
                  },
                ],
            );
          });

          it('should return an array of RunScriptResult objects', async function () {
            await expect(
              ctrl.runScripts(scripts, opts),
              'to be fulfilled with value satisfying',
              expect
                .it('to have items satisfying', {
                  rawResult: {},
                  skipped: false,
                  error: undefined,
                })
                .and('to have length', 4),
            );
          });

          it('should emit RunScriptsBegin', async function () {
            await ctrl.runScripts(scripts, opts);
            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.RunScriptsBegin,
              {
                manifest: {'nullpm@1.0.0': expect.it('to have length', 4)},
                total: 4,
              },
            ]);
          });

          it('should emit RunScriptsOk', async function () {
            await ctrl.runScripts(scripts, opts);
            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.RunScriptsOk,
              {
                manifest: {'nullpm@1.0.0': expect.it('to have length', 4)},
                total: 4,
                results: expect.it('to be an array'),
                failed: 0,
                passed: 4,
                skipped: 0,
              },
            ]);
          });

          it('should emit RunScriptBegin for each script', async function () {
            await ctrl.runScripts(scripts, opts);
            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.RunScriptBegin,
              {
                script: scripts[0],
                cwd: expect.it('to start with', MOCK_TMPROOT),
                pkgName: 'foo',
                total: 4,
                current: 1,
              },
            ])
              .and('to have a call satisfying', [
                SmokerEvent.RunScriptBegin,
                {
                  script: scripts[1],
                  cwd: expect.it('to start with', MOCK_TMPROOT),
                  pkgName: 'foo',
                  total: 4,
                  current: 2,
                },
              ])
              .and('to have a call satisfying', [
                SmokerEvent.RunScriptBegin,
                {
                  script: scripts[0],
                  cwd: expect.it('to start with', MOCK_TMPROOT),
                  pkgName: 'bar',
                  total: 4,
                  current: 3,
                },
              ])
              .and('to have a call satisfying', [
                SmokerEvent.RunScriptBegin,
                {
                  script: scripts[1],
                  cwd: expect.it('to start with', MOCK_TMPROOT),
                  pkgName: 'bar',
                  total: 4,
                  current: 4,
                },
              ]);
          });

          describe('when a script fails', function () {
            let result: RunScriptResult;
            beforeEach(function () {
              result = {
                rawResult: {
                  stdout: '',
                  stderr: '',
                  command: '',
                  exitCode: 1,
                  failed: true,
                },
                error: new ScriptFailedError('oh no'),
                skipped: false,
              };
              sandbox.stub(pkgManager, 'runScript').resolves(result);
            });

            it('should emit RunScriptFailed', async function () {
              await ctrl.runScripts(scripts);
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.RunScriptFailed,
                {
                  total: 4,
                  current: expect.it('to be a number'),
                  error: result.error,
                },
              ]);
            });

            it('should emit RunScriptsFailed', async function () {
              await ctrl.runScripts(scripts).catch(() => {});
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.RunScriptsFailed,
                {
                  results: expect.it('to be an array'),
                  failed: expect.it('to be a number'),
                  passed: 0,
                },
              ]);
            });

            describe('when the "bail" flag is true', function () {
              beforeEach(function () {
                opts = {bail: true};
              });

              it('should only execute the first script', async function () {
                const results = await ctrl.runScripts(scripts, opts);
                expect(results, 'to have length', 1);
              });

              it('should emit RunScriptFailed', async function () {
                await ctrl.runScripts(scripts);
                expect(eventBus.emit, 'to have a call satisfying', [
                  SmokerEvent.RunScriptFailed,
                  {
                    total: 4,
                    current: expect.it('to be a number'),
                    error: result.error,
                  },
                ]);
              });

              it('should emit RunScriptsFailed', async function () {
                await ctrl.runScripts(scripts, opts);
                expect(eventBus.emit, 'to have a call satisfying', [
                  SmokerEvent.RunScriptsFailed,
                  {
                    results: expect
                      .it('to be an array')
                      .and('to have length', 1),
                    failed: 1,
                    passed: 0,
                    total: 4,
                  },
                ]);
              });
            });
          });

          describe('when a script is skipped', function () {
            let result: RunScriptResult;

            beforeEach(function () {
              result = {
                rawResult: {
                  stdout: '',
                  stderr: '',
                  command: '',
                  exitCode: 1,
                  failed: true,
                },
                skipped: true,
              };
              sandbox.stub(pkgManager, 'runScript').resolves(result);
            });

            it('should emit RunScriptSkipped', async function () {
              await ctrl.runScripts(scripts, opts);
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.RunScriptSkipped,
                {
                  script: scripts[0],
                  cwd: expect.it('to start with', MOCK_TMPROOT),
                  pkgName: 'foo',
                  total: 4,
                  current: 1,
                  skipped: true,
                },
              ])
                .and('to have a call satisfying', [
                  SmokerEvent.RunScriptSkipped,
                  {
                    script: scripts[1],
                    cwd: expect.it('to start with', MOCK_TMPROOT),
                    pkgName: 'foo',
                    total: 4,
                    current: 2,
                    skipped: true,
                  },
                ])
                .and('to have a call satisfying', [
                  SmokerEvent.RunScriptSkipped,
                  {
                    script: scripts[0],
                    cwd: expect.it('to start with', MOCK_TMPROOT),
                    pkgName: 'bar',
                    total: 4,
                    current: 3,
                    skipped: true,
                  },
                ])
                .and('to have a call satisfying', [
                  SmokerEvent.RunScriptSkipped,
                  {
                    script: scripts[1],
                    cwd: expect.it('to start with', MOCK_TMPROOT),
                    pkgName: 'bar',
                    total: 4,
                    current: 4,
                    skipped: true,
                  },
                ]);
            });

            it('should emit RunScriptsOk', async function () {
              await ctrl.runScripts(scripts, opts);
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.RunScriptsOk,
                {
                  manifest: {'nullpm@1.0.0': expect.it('to have length', 4)},
                  total: 4,
                  results: expect.it('to be an array'),
                  failed: 0,
                  passed: 0,
                  skipped: 4,
                },
              ]);
            });
          });

          describe('when a PkgManager throws', function () {
            let err: Error;

            beforeEach(function () {
              err = new Error('egad');
              sandbox.stub(pkgManager, 'runScript').rejects(err);
            });

            it('should reject', async function () {
              await expect(
                () => ctrl.runScripts(scripts, opts),
                'to be rejected with error satisfying',
                {cause: err, code: ErrorCodes.PackageManagerError},
              );
            });

            it('should not emit RunScriptFailed', async function () {
              await ctrl.runScripts(scripts, opts).catch(() => {});
              expect(eventBus.emit, 'not to have calls satisfying', [
                SmokerEvent.RunScriptFailed,
                {},
              ]);
            });

            it('should not emit RunScriptsFailed', async function () {
              await ctrl.runScripts(scripts, opts).catch(() => {});
              expect(eventBus.emit, 'not to have calls satisfying', [
                SmokerEvent.RunScriptsFailed,
                {},
              ]);
            });

            describe('when the "bail" flag is true', function () {
              beforeEach(function () {
                opts = {bail: true};
              });

              it('should reject', async function () {
                await expect(
                  () => ctrl.runScripts(scripts, opts),
                  'to be rejected with error satisfying',
                  {cause: err, code: ErrorCodes.PackageManagerError},
                );
              });

              it('should not emit RunScriptFailed', async function () {
                await ctrl.runScripts(scripts, opts).catch(() => {});
                expect(eventBus.emit, 'not to have calls satisfying', [
                  SmokerEvent.RunScriptFailed,
                  {},
                ]);
              });

              it('should not emit RunScriptsFailed', async function () {
                await ctrl.runScripts(scripts, opts).catch(() => {});
                expect(eventBus.emit, 'not to have calls satisfying', [
                  SmokerEvent.RunScriptsFailed,
                  {},
                ]);
              });
            });
          });
        });

        describe('pack()', function () {
          let ctrl: PMC.PkgManagerController;
          let pkgManager: SomePkgManager;
          let pkgManagerPackStub: SinonStubbedMember<SomePkgManager['pack']>;

          beforeEach(async function () {
            registry.getExecutor.returns(nullExecutor);
            ctrl = new PkgManagerController(registry, eventBus, [], {
              verbose: true,
            });
            pkgManager = PkgManager.create('nullpm', nullPmDef, plugin, {
              tmpdir: path.join(
                MOCK_TMPROOT,
                MIDNIGHT_SMOKER,
                'nullpm-1.0.0',
                'asdf',
              ),
              spec: await PkgManagerSpec.from('nullpm@1.0.0'),
            } as PkgManagerContext);
            sandbox.replaceGetter(ctrl, 'pkgManagers', () => [pkgManager]);
            pkgManagerPackStub = sandbox.stub(pkgManager, 'pack').resolves();
          });

          it('should call pack on all PkgManagers', async function () {
            await ctrl.pack();
            expect(pkgManager.pack, 'was called once');
          });

          it('should emit PackBegin', async function () {
            await ctrl.pack();
            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.PackBegin,
              {
                uniquePkgs: [],
                pkgManagers: [pkgManager.spec.toJSON()],
              },
            ]);
          });

          it('should emit PackOk', async function () {
            await ctrl.pack();
            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.PackOk,
              {
                uniquePkgs: [],
                pkgManagers: [pkgManager.spec.toJSON()],
              },
            ]);
          });

          describe('when a PkgManager throws a PackError', function () {
            let err: PackError;

            beforeEach(function () {
              err = new PackError('oh no', pkgManager.spec, 'something');
              pkgManagerPackStub.rejects(err);
            });

            it('should reject', async function () {
              await expect(
                ctrl.pack(),
                'to be rejected with error satisfying',
                err,
              );
            });

            it('should emit PackFailed', async function () {
              // TODO find a better way to express this
              await expect(ctrl.pack(), 'to be rejected');
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.PackFailed,
                {
                  uniquePkgs: [],
                  pkgManagers: [pkgManager.spec.toJSON()],
                  error: err,
                },
              ]);
            });
          });

          describe('when a PkgManager throws a PackParseError', function () {
            let err: PackParseError;

            beforeEach(function () {
              err = new PackParseError(
                'ugh',
                pkgManager.spec,
                new SyntaxError('yikes dogg'),
                'stuff',
              );
              pkgManagerPackStub.rejects(err);
            });

            it('should reject', async function () {
              await expect(
                ctrl.pack(),
                'to be rejected with error satisfying',
                err,
              );
            });

            it('should emit PackFailed', async function () {
              // TODO find a better way to express this
              await expect(ctrl.pack(), 'to be rejected');
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.PackFailed,
                {
                  uniquePkgs: [],
                  pkgManagers: [pkgManager.spec.toJSON()],
                  error: err,
                },
              ]);
            });
          });

          describe('when a PkgManager throws whatever', function () {
            let err: Error;
            beforeEach(function () {
              err = new Error('rando');
              pkgManagerPackStub.rejects(err);
            });

            it('should reject', async function () {
              await expect(
                ctrl.pack(),
                'to be rejected with error satisfying',
                err,
              );
            });

            it('should not emit PackFailed', async function () {
              await ctrl.pack().catch(() => {});
              expect(eventBus.emit, 'not to have calls satisfying', [
                SmokerEvent.PackFailed,
                {},
              ]);
            });
          });
        });

        describe('install()', function () {
          let ctrl: PMC.PkgManagerController;
          let pkgManager: SomePkgManager;
          let pkgManagerInstallStub: SinonStubbedMember<
            SomePkgManager['install']
          >;

          beforeEach(async function () {
            pkgManager = PkgManager.create('nullpm', nullPmDef, plugin, {
              tmpdir: path.join(
                MOCK_TMPROOT,
                MIDNIGHT_SMOKER,
                'nullpm-1.0.0',
                'asdf',
              ),
              spec: await PkgManagerSpec.from('nullpm@1.0.0'),
            } as PkgManagerContext);
            registry.getExecutor.returns(nullExecutor);
            ctrl = new PkgManagerController(registry, eventBus, [], {});
            sandbox.replaceGetter(ctrl, 'pkgManagers', () => [pkgManager]);
            sandbox.stub(pkgManager, 'addAdditionalDep');
            pkgManagerInstallStub = sandbox.stub(pkgManager, 'install');
            sandbox.replaceGetter(
              pkgManager,
              'installManifests',
              () =>
                <InstallManifest[]>[
                  {
                    isAdditional: false,
                    pkgSpec: 'foo@1.0.0',
                    pkgName: 'foo',
                    cwd: MOCK_TMPROOT,
                    installPath: path.join(MOCK_TMPROOT, 'node_modules', 'foo'),
                  },
                  {
                    isAdditional: false,
                    pkgSpec: 'bar@1.0.0',
                    pkgName: 'bar',
                    cwd: MOCK_TMPROOT,
                    installPath: path.join(MOCK_TMPROOT, 'node_modules', 'bar'),
                  },
                ],
            );
          });

          it('should add additional dependencies to all package managers', async function () {
            const additionalDeps = ['dep1', 'dep2'];
            await ctrl.install(additionalDeps);
            expect(
              pkgManager.addAdditionalDep,
              'to have calls exhaustively satisfying',
              [['dep1'], ['dep2']],
            );
          });

          it('should call install() on each PkgManager', async function () {
            await ctrl.install();
            expect(pkgManager.install, 'was called once');
          });

          it('should emit InstallBegin', async function () {
            await ctrl.install();
            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.InstallBegin,
              {
                pkgManagers: [pkgManager.spec.toJSON()],
              },
            ]);
          });

          describe('when installation succeeds', function () {
            it('should emit InstallOk', async function () {
              await ctrl.install();
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.InstallOk,
                {
                  pkgManagers: [pkgManager.spec.toJSON()],
                },
              ]);
            });

            it('should emit PkgManagerInstallBegin for each PkgManager', async function () {
              await ctrl.install();
              expect(eventBus.emit, 'to have a call exhaustively satisfying', [
                SmokerEvent.PkgManagerInstallBegin,
                {
                  pkgManager: pkgManager.spec.toJSON(),
                  current: 2,
                  total: 2,
                },
              ]);
            });

            it('should emit PkgManagerInstallOk for each PkgManager', async function () {
              await ctrl.install();
              expect(eventBus.emit, 'to have a call exhaustively satisfying', [
                SmokerEvent.PkgManagerInstallOk,
                {
                  pkgManager: pkgManager.spec.toJSON(),
                  current: 2,
                  total: 2,
                },
              ]);
            });
          });

          describe('when installation fails', function () {
            let err: InstallError;
            beforeEach(function () {
              err = new InstallError(
                'Install failed',
                pkgManager.spec,
                ['foo@1.0.0', 'bar@1.0.0'],
                pkgManager.tmpdir,
              );
              pkgManagerInstallStub.rejects(err);
            });

            it('should emit PkgManagerInstallFailed', async function () {
              await ctrl.install().catch(() => {});
              expect(eventBus.emit, 'to have a call exhaustively satisfying', [
                SmokerEvent.PkgManagerInstallFailed,
                {
                  pkgManager: pkgManager.spec.toJSON(),
                  error: err,
                  total: 2,
                  current: 2,
                },
              ]);
            });

            it('should emit InstallFailed', async function () {
              await ctrl.install().catch(() => {});
              expect(eventBus.emit, 'to have a call exhaustively satisfying', [
                SmokerEvent.InstallFailed,
                {
                  uniquePkgs: ['foo', 'bar'],
                  pkgManagers: [pkgManager.spec.toJSON()],
                  additionalDeps: [],
                  manifests: pkgManager.installManifests,
                  error: err,
                  total: 2,
                },
              ]);
            });

            it('should reject', async function () {
              await expect(
                ctrl.install(),
                'to be rejected with error satisfying',
                err,
              );
            });
          });
        });
      });
    });
  });
});
