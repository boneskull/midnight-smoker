import {ComponentKinds, MIDNIGHT_SMOKER} from '#constants';
import type * as PMC from '#controller/pkg-manager-controller';
import {PackageManagerError} from '#error';
import {EventBus, SmokerEvent, type SmokerEventBus} from '#event';
import {
  PkgManager,
  PkgManagerSpec,
  ScriptFailedError,
  type InstallResult,
  type PkgManagerContext,
  type RunScriptResult,
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
  describe('ctrl', function () {
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
          const opts: PMC.PkgManagerControllerRunScriptsOpts = {}; // replace with actual options
          let installResults: InstallResult[];

          beforeEach(function () {
            // registry.getScriptRunner.returns(nullScriptRunner);
            installResults = [
              {
                rawResult: {} as any,
                installManifests: [
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
              },
            ];
          });

          it('should return an array of RunScriptResult objects', async function () {
            await expect(
              ctrl.runScripts(scripts, opts),
              'to be fulfilled with value satisfying',
              expect
                .it('to have items satisfying', {
                  pkgName: expect.it('to be a string'),
                  script: expect.it('to be a string'),
                })
                .and('to have length', 4),
            );
          });

          it('should emit RunScriptsBegin', async function () {
            await ctrl.runScripts(scripts, opts);
            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.RunScriptsBegin,
              {manifest: {}, total: 0},
            ]);
          });

          it('should emit RunScriptsOk', async function () {
            await ctrl.runScripts(scripts, opts);
            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.RunScriptsOk,
              {manifest: {}, total: 0, results: [], failed: 0, passed: 0},
            ]);
          });

          describe('when a script fails', function () {
            let result: RunScriptResult;
            beforeEach(function () {
              // brokenScriptRunner = sandbox
              //   .stub()
              //   .callsFake(
              //     async (
              //       runManifest: RunScriptManifest,
              //       pkgManager: PkgManager,
              //       opts: ScriptRunnerOpts,
              //     ) => {
              //       await Promise.resolve();
              //       if (opts.signal?.aborted) {
              //         throw new Errors.ScriptBailed();
              //       }
              //       ctrl.emit(
              //         SmokerEvent.RunScriptFailed,
              //         result as ScriptFailedEventData,
              //       );
              //       return result;
              //     },
              //   );
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
            });

            it('should emit RunScriptFailed', async function () {
              await ctrl.runScripts(scripts, {bail: true});
              expect(eventBus.emit, 'to have a call satisfying', [
                SmokerEvent.RunScriptFailed,
              ]);
            });

            it('should emit RunScriptsFailed', async function () {
              await expect(
                () => ctrl.runScripts(scripts, opts).catch(() => {}),
                'to emit from',
                ctrl,
                SmokerEvent.RunScriptsFailed,
              );
            });

            describe('when the "bail" flag is true', function () {
              beforeEach(function () {
                // registry.getScriptRunner.returns(brokenScriptRunner);
              });

              it('should only execute the first script', async function () {
                const results = await ctrl.runScripts(scripts, {
                  bail: true,
                });
                expect(results, 'to have length', 1);
              });

              it('should emit RunScriptFailed', async function () {
                await expect(
                  () =>
                    ctrl
                      .runScripts(scripts, {
                        bail: true,
                      })
                      .catch(() => {}),
                  'to emit from',
                  ctrl,
                  SmokerEvent.RunScriptFailed,
                );
              });

              it('should emit RunScriptsFailed', async function () {
                await expect(
                  () =>
                    ctrl
                      .runScripts(scripts, {
                        bail: true,
                      })
                      .catch(() => {}),
                  'to emit from',
                  ctrl,
                  SmokerEvent.RunScriptsFailed,
                );
              });
            });

            describe('when the script runner rejects', function () {
              let err: PackageManagerError;

              beforeEach(function () {
                err = new PackageManagerError(
                  'egad',
                  {} as PkgManagerSpec,
                  new Error('execa error'),
                );
              });

              it('should only execute the first script', async function () {
                await ctrl.runScripts(scripts, {bail: true}).catch(() => {});
                // expect(brokenScriptRunner, 'was called once');
              });

              it('should reject', async function () {
                await expect(
                  () =>
                    ctrl.runScripts(scripts, {
                      bail: true,
                    }),
                  'to be rejected with error satisfying',
                  err,
                );
              });

              it('should not emit RunScriptFailed', async function () {
                await expect(
                  () => ctrl.runScripts(scripts, {bail: true}).catch(() => {}),
                  'not to emit from',
                  ctrl,
                  SmokerEvent.RunScriptFailed,
                );
              });

              it('should not emit RunScriptsFailed', async function () {
                await expect(
                  () => ctrl.runScripts(scripts, {bail: true}).catch(() => {}),
                  'not to emit from',
                  ctrl,
                  SmokerEvent.RunScriptsFailed,
                );
              });
            });
          });

          describe('when the script runner rejects', function () {
            let err: PackageManagerError;
            beforeEach(function () {
              err = new PackageManagerError(
                'egad',
                {} as PkgManagerSpec,
                new Error('execa error'),
              );
            });

            it('should reject', async function () {
              await expect(
                () => ctrl.runScripts(scripts, opts),
                'to be rejected with error satisfying',
                err,
              );
            });

            it('should not emit RunScriptFailed', async function () {
              await expect(
                () => ctrl.runScripts(scripts, opts).catch(() => {}),
                'not to emit from',
                ctrl,
                SmokerEvent.RunScriptFailed,
              );
            });

            it('should not emit RunScriptsFailed', async function () {
              await expect(
                () => ctrl.runScripts(scripts, opts).catch(() => {}),
                'not to emit from',
                ctrl,
                SmokerEvent.RunScriptsFailed,
              );
            });
          });
        });
      });
    });
  });
});

// describe('midnight-smoker', function () {
//   describe('component', function () {
//     describe('package manager', function () {
//       describe('PkgManagerController', function () {
//         const specs = ['nullpm@1.0.0', 'nullpm@2.0.0'];

//         let PkgManagerSpec: typeof PkgMgr.PkgManagerSpec;
//         let sandbox: sinon.SinonSandbox;
//         let registry: sinon.SinonStubbedInstance<PluginRegistry>;
//         let PkgManagerController: typeof Controller.PkgManagerController;

//         beforeEach(function () {
//           sandbox = createSandbox();
//           const {mocks} = createFsMocks();
//           registry = sandbox.createStubInstance(PluginRegistry);
//           // ({PkgManagerSpec} = rewiremock.proxy(
//           //   () =>
//           //     require('../../../../src/component/pkg-manager/pkg-manager-spec'),
//           //   mocks,
//           // ));
//           ({PkgManagerController} = rewiremock.proxy(
//             () => require('../../../../src/ctrl'),
//             mocks,
//           ));
//         });

//         afterEach(function () {
//           sandbox.restore();
//         });

//         describe('constructor', function () {
//           it('should return a PkgManagerController', function () {
//             const ctrl = new PkgManagerController(registry, specs, {});
//             expect(ctrl, 'to be a', PkgManagerController);
//           });
//         });

//         describe('method', function () {
//           let ctrl: Controller.PkgManagerController;
//           let pkgManagerMap: Map<PkgMgr.PkgManagerSpec, PkgMgr.PkgManager>;
//           let nullPm1: NullPm;
//           let nullPm2: NullPm;

//           beforeEach(async function () {
//             const [spec1, spec2] = await Promise.all([
//               PkgManagerSpec.from('nullpm@1.0.0'),
//               PkgManagerSpec.from('nullpm@2.0.0'),
//             ]);
//             nullPm1 = new NullPm(spec1);
//             nullPm2 = new NullPm(spec2);
//             pkgManagerMap = new Map([
//               [spec1, nullPm1],
//               [spec2, nullPm2],
//             ]);
//             registry.loadPackageManagers.resolves(pkgManagerMap);

//             ctrl = new PkgManagerController(registry, specs, {});
//           });

//           describe('getPkgManagers()', function () {
//             it('should return an array of frozen package managers', async function () {
//               await expect(
//                 ctrl.getPkgManagers(),
//                 'to be fulfilled with value satisfying',
//                 expect
//                   .it('to equal', [nullPm1, nullPm2])
//                   .and(
//                     'when passed as parameter to',
//                     Object.isFrozen,
//                     'to be true',
//                   ),
//               );
//             });

//             it('should delegate to its PluginRegistry and cache the result', async function () {
//               await ctrl.getPkgManagers();
//               await ctrl.getPkgManagers();
//               expect(registry.loadPackageManagers, 'was called once');
//             });
//           });

// });
//       });
//     });
//   });
// });
