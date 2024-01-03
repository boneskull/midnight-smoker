import {
  MOCK_TMPDIR,
  NULL_SPEC,
  NullPm,
  nullScriptRunner,
} from '@midnight-smoker/test-util';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEE from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import type {
  InstallResult,
  PkgManager,
  PkgManagerRunScriptManifest,
  RunScriptResult,
  ScriptRunner,
  ScriptRunnerNotifiers,
  ScriptRunnerOpts,
} from '../../../../src/component';
import {component} from '../../../../src/component';
import type * as Controller from '../../../../src/component/package-manager/controller';
import {
  PackError,
  PackageManagerError,
  RunScriptBailed,
  ScriptFailedError,
} from '../../../../src/error';
import {SmokerEvent} from '../../../../src/event/event-constants';
import type {RunScriptFailedEventData} from '../../../../src/event/script-runner-events';
import {PluginRegistry} from '../../../../src/plugin';

const expect = unexpected.clone().use(unexpectedEE).use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('PkgManagerController', function () {
        const specs = ['foo@1.0.0', 'bar@latest'];

        let sandbox: sinon.SinonSandbox;
        let registry: sinon.SinonStubbedInstance<PluginRegistry>;
        let PkgManagerController: typeof Controller.SmokerPkgManagerController;
        let nullPm: NullPm;

        beforeEach(function () {
          sandbox = createSandbox();
          nullPm = new NullPm(NULL_SPEC);
          registry = sandbox.createStubInstance(PluginRegistry);
          ({SmokerPkgManagerController: PkgManagerController} =
            rewiremock.proxy(
              () =>
                require('../../../../src/component/package-manager/controller'),
              {},
            ));
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('constructor', function () {
          it('should return a PkgManagerController', function () {
            const controller = new PkgManagerController(registry, specs, {});
            expect(controller, 'to be a', PkgManagerController);
          });
        });

        describe('method', function () {
          let controller: Controller.PkgManagerController;
          let pkgManagerMap: Map<string, PkgManager>;

          beforeEach(function () {
            pkgManagerMap = new Map([
              ['foo', nullPm],
              ['bar', nullPm],
            ]);
            registry.loadPackageManagers.resolves(pkgManagerMap);

            controller = new PkgManagerController(registry, specs, {});
          });

          describe('getPkgManagers()', function () {
            it('should return an array of frozen package managers', async function () {
              await expect(
                controller.getPkgManagers(),
                'to be fulfilled with value satisfying',
                expect
                  .it('to equal', [nullPm, nullPm])
                  .and(
                    'when passed as parameter to',
                    Object.isFrozen,
                    'to be true',
                  ),
              );
            });

            it('should delegate to its PluginRegistry and cache the result', async function () {
              await controller.getPkgManagers();
              await controller.getPkgManagers();
              expect(registry.loadPackageManagers, 'was called once');
            });
          });

          describe('pack()', function () {
            describe('when packing succeeds', function () {
              beforeEach(async function () {
                sandbox.spy(nullPm, 'pack');
              });

              it('should resolve with an array of PkgManagerInstallManifest', async function () {
                await expect(
                  controller.pack(),
                  'to be fulfilled with value satisfying',
                  [
                    {
                      pkgManager: nullPm,
                      isAdditional: false,
                      spec: expect.it('to be a string'),
                      pkgName: expect.it('to be a string'),
                      cwd: MOCK_TMPDIR,
                    },
                    {
                      pkgManager: nullPm,
                      isAdditional: false,
                      spec: expect.it('to be a string'),
                      pkgName: expect.it('to be a string'),
                      cwd: MOCK_TMPDIR,
                    },
                  ],
                );
              });

              it('should resolve with an array with minimum length of the count of package managers', async function () {
                expect(
                  (await controller.pack()).length,
                  'to be greater than or equal to',
                  2,
                );
              });
            });

            it('should emit PackBegin', async function () {
              await expect(
                () => controller.pack(),
                'to emit from',
                controller,
                SmokerEvent.PackBegin,
              );
            });

            it('should emit PackOk', async function () {
              await expect(
                () => controller.pack(),
                'to emit from',
                controller,
                SmokerEvent.PackOk,
              );
            });
          });

          describe('when packing fails', function () {
            describe('with a non-PackError', function () {
              let err: Error;
              beforeEach(function () {
                err = new Error('stuff');
                sandbox.stub(nullPm, 'pack').rejects(err);
              });

              it('should reject', async function () {
                await expect(
                  controller.pack(),
                  'to be rejected with error satisfying',
                  err,
                );
              });

              it('should not emit PackFailed', function () {
                return expect(
                  () => controller.pack().catch(() => {}),
                  'not to emit from',
                  controller,
                  SmokerEvent.PackFailed,
                );
              });
            });

            describe('with a PackError', function () {
              let err: PackError;

              beforeEach(function () {
                err = new PackError('oh no', nullPm.spec, MOCK_TMPDIR);
                sandbox.stub(nullPm, 'pack').rejects(err);
              });

              it('should emit PackFailed with the PackError', async function () {
                await expect(
                  () => controller.pack().catch(() => {}),
                  'to emit from',
                  controller,
                  SmokerEvent.PackFailed,
                  err,
                );
              });
            });
          });

          describe('runScripts()', function () {
            const scripts = ['script1', 'script2'];
            const opts: Controller.RunScriptsOpts = {}; // replace with actual options
            let installResults: InstallResult[];

            beforeEach(function () {
              registry.getScriptRunner.returns(
                component({
                  name: 'default',
                  value: nullScriptRunner,
                  owner: {id: 'test-controller'},
                  kind: 'ScriptRunner',
                }),
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
                      installPath: path.join(
                        MOCK_TMPDIR,
                        'node_modules',
                        'foo',
                      ),
                    },
                    {
                      pkgManager: nullPm,
                      isAdditional: false,
                      spec: 'bar@1.0.0',
                      pkgName: 'bar',
                      cwd: MOCK_TMPDIR,
                      installPath: path.join(
                        MOCK_TMPDIR,
                        'node_modules',
                        'bar',
                      ),
                    },
                  ],
                },
              ];
            });

            it('should return an array of RunScriptResult objects', async function () {
              await expect(
                controller.runScripts(scripts, installResults, opts),
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
              await expect(
                () => controller.runScripts(scripts, installResults, opts),
                'to emit from',
                controller,
                SmokerEvent.RunScriptsBegin,
              );
            });

            it('should emit RunScriptsOk', function () {
              return expect(
                () => controller.runScripts(scripts, installResults, opts),
                'to emit from',
                controller,
                SmokerEvent.RunScriptsOk,
              );
            });

            describe('when a script fails', function () {
              let result: RunScriptResult;
              let brokenScriptRunner: ScriptRunner;

              beforeEach(function () {
                brokenScriptRunner = sandbox
                  .stub()
                  .callsFake(
                    async (
                      notifiers: ScriptRunnerNotifiers,
                      runManifest: PkgManagerRunScriptManifest,
                      opts: ScriptRunnerOpts,
                    ) => {
                      await Promise.resolve();
                      if (opts.signal.aborted) {
                        throw new RunScriptBailed();
                      }
                      controller.emit(
                        SmokerEvent.RunScriptFailed,
                        result as RunScriptFailedEventData,
                      );
                      return result;
                    },
                  );
                result = {
                  pkgName: 'foo',
                  script: 'script1',
                  rawResult: {
                    stdout: '',
                    stderr: '',
                    command: '',
                    exitCode: 1,
                    failed: true,
                  },
                  error: new ScriptFailedError('oh no'),
                  cwd: MOCK_TMPDIR,
                };

                const scriptRunner = component({
                  name: 'default',
                  value: brokenScriptRunner,
                  kind: 'ScriptRunner',
                  owner: {
                    id: 'test-controller',
                  },
                });

                registry.getScriptRunner.returns(scriptRunner);
              });

              it('should emit RunScriptFailed', async function () {
                await expect(
                  () =>
                    controller
                      .runScripts(scripts, installResults, {
                        bail: true,
                      })
                      .catch(() => {}),
                  'to emit from',
                  controller,
                  SmokerEvent.RunScriptFailed,
                );
              });

              it('should emit RunScriptsFailed', async function () {
                await expect(
                  () =>
                    controller
                      .runScripts(scripts, installResults, opts)
                      .catch(() => {}),
                  'to emit from',
                  controller,
                  SmokerEvent.RunScriptsFailed,
                );
              });

              describe('when the "bail" flag is true', function () {
                beforeEach(function () {
                  const scriptRunner = component({
                    name: 'default',
                    value: brokenScriptRunner,
                    kind: 'ScriptRunner',
                    owner: {id: 'test-controller'},
                  });
                  registry.getScriptRunner.returns(scriptRunner);
                });

                it('should only execute the first script', async function () {
                  const results = await controller.runScripts(
                    scripts,
                    installResults,
                    {
                      bail: true,
                    },
                  );
                  expect(results, 'to have length', 1);
                });

                it('should emit RunScriptFailed', async function () {
                  await expect(
                    () =>
                      controller
                        .runScripts(scripts, installResults, {
                          bail: true,
                        })
                        .catch(() => {}),
                    'to emit from',
                    controller,
                    SmokerEvent.RunScriptFailed,
                  );
                });

                it('should emit RunScriptsFailed', async function () {
                  await expect(
                    () =>
                      controller
                        .runScripts(scripts, installResults, {
                          bail: true,
                        })
                        .catch(() => {}),
                    'to emit from',
                    controller,
                    SmokerEvent.RunScriptsFailed,
                  );
                });
              });

              describe('when the script runner rejects', function () {
                let err: PackageManagerError;
                let brokenScriptRunner: ScriptRunner;

                beforeEach(function () {
                  err = new PackageManagerError(
                    'egad',
                    NULL_SPEC,
                    new Error('execa error'),
                  );
                  brokenScriptRunner = sandbox.stub().rejects(err);
                  registry.getScriptRunner.returns(
                    component({
                      name: 'default',
                      value: brokenScriptRunner,
                      kind: 'ScriptRunner',
                      owner: {
                        id: 'test-controller',
                      },
                    }),
                  );
                });

                it('should only execute the first script', async function () {
                  await controller
                    .runScripts(scripts, installResults, {bail: true})
                    .catch(() => {});
                  expect(brokenScriptRunner, 'was called once');
                });

                it('should reject', async function () {
                  await expect(
                    () =>
                      controller.runScripts(scripts, installResults, {
                        bail: true,
                      }),
                    'to be rejected with error satisfying',
                    err,
                  );
                });

                it('should not emit RunScriptFailed', async function () {
                  await expect(
                    () =>
                      controller
                        .runScripts(scripts, installResults, {bail: true})
                        .catch(() => {}),
                    'not to emit from',
                    controller,
                    SmokerEvent.RunScriptFailed,
                  );
                });

                it('should not emit RunScriptsFailed', async function () {
                  await expect(
                    () =>
                      controller
                        .runScripts(scripts, installResults, {bail: true})
                        .catch(() => {}),
                    'not to emit from',
                    controller,
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
                  NULL_SPEC,
                  new Error('execa error'),
                );
                const scriptRunner = component({
                  name: 'default',
                  value: sandbox.stub().rejects(err),
                  owner: {id: 'test-controller'},
                  kind: 'ScriptRunner',
                });
                registry.getScriptRunner.returns(scriptRunner);
              });

              it('should reject', async function () {
                await expect(
                  () => controller.runScripts(scripts, installResults, opts),
                  'to be rejected with error satisfying',
                  err,
                );
              });

              it('should not emit RunScriptFailed', async function () {
                await expect(
                  () =>
                    controller
                      .runScripts(scripts, installResults, opts)
                      .catch(() => {}),
                  'not to emit from',
                  controller,
                  SmokerEvent.RunScriptFailed,
                );
              });

              it('should not emit RunScriptsFailed', async function () {
                await expect(
                  () =>
                    controller
                      .runScripts(scripts, installResults, opts)
                      .catch(() => {}),
                  'not to emit from',
                  controller,
                  SmokerEvent.RunScriptsFailed,
                );
              });
            });
          });
        });
      });
    });
  });
});
