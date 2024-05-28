import Debug from 'debug';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createEmptyActor, type AnyActorRef} from 'xstate';
import {ERROR, OK} from '../../../src/constants';
import {ErrorCodes} from '../../../src/error';
import {type RuleInitPayload} from '../../../src/machine/loader/loader-machine-types';
import {
  PkgManagerMachine,
  type PkgManagerMachineInput,
} from '../../../src/machine/pkg-manager';
import {OptionParser, type SmokerOptions} from '../../../src/options';
import {
  PkgManagerSpec,
  type PkgManagerDef,
  type WorkspaceInfo,
} from '../../../src/pkg-manager';
import {type PluginMetadata} from '../../../src/plugin';
import {PluginRegistry} from '../../../src/plugin/plugin-registry';
import {FileManager} from '../../../src/util/filemanager';
import {nullExecutor, nullPkgManager, nullRule} from '../mocks/component';
import {createMachineRunner} from './machine-helpers';
const debug = Debug('midnight-smoker:test:machine');
const expect = unexpected.clone().use(unexpectedSinon);

const {runUntilSnapshot, runMachine, runUntilEvent} = createMachineRunner(
  PkgManagerMachine,
  {
    logger: debug,
  },
);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('PkgManagerMachine', function () {
      let plugin: Readonly<PluginMetadata>;
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      let smokerOptions: SmokerOptions;
      let sandbox: sinon.SinonSandbox;
      let def: PkgManagerDef;
      let rootActor: AnyActorRef;
      let spec: PkgManagerSpec;
      let setup: sinon.SinonStub;
      let teardown: sinon.SinonStub;
      let ruleInitPayloads: RuleInitPayload[];

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({fileManager});
        sandbox = createSandbox();
        plugin = await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.definePackageManager(nullPkgManager);
            api.defineRule(nullRule);
          },
        });
        def = {...nullPkgManager};
        smokerOptions = OptionParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          reporter: 'test-plugin/test-reporter',
        });
        rootActor = createEmptyActor();
        setup = sandbox.stub(def, 'setup').resolves();
        teardown = sandbox.stub(def, 'teardown').resolves();
        spec = await PkgManagerSpec.from('test-pm@1.0.0');
        ruleInitPayloads = plugin.ruleDefs.map((def) => ({
          def,
          id: pluginRegistry.getComponentId(def),
          plugin,
        }));
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('lifecycle hooks', function () {
        let input: PkgManagerMachineInput;
        beforeEach(async function () {
          input = {
            def,
            executor: nullExecutor,
            plugin: plugin.toJSON(),
            fileManager,
            index: 0,
            parentRef: rootActor,
            ruleConfigs: smokerOptions.rules,
            signal: new AbortController().signal,
            spec,
            useWorkspaces: false,
            workspaceInfo: [],
            shouldShutdown: true,
          };
        });

        it('should call the "setup" lifecycle hook', async function () {
          await runMachine(input);
          expect(def.setup, 'was called once');
        });

        describe('when the "setup" hook rejects', function () {
          beforeEach(function () {
            setup.rejects(new Error('setup failed'));
          });

          it('should call the "teardown" lifecycle hook', async function () {
            await runMachine(input);
            expect(def.teardown, 'was called once');
          });

          it('should output with a MachineError', async function () {
            await expect(
              runMachine(input),
              'to be fulfilled with value satisfying',
              {
                type: ERROR,
                error: {
                  code: ErrorCodes.MachineError,
                  errors: [
                    {
                      code: ErrorCodes.LifecycleError,
                      context: {stage: 'setup'},
                    },
                  ],
                },
              },
            );
          });
        });

        it('should call the "teardown" lifecycle hook', async function () {
          await runMachine(input);
          expect(def.teardown, 'was called once');
        });

        describe('when the "teardown" hook rejects', function () {
          beforeEach(function () {
            teardown.rejects(new Error('teardown failed'));
          });

          it('should output with a MachineError', async function () {
            await expect(
              runMachine(input),
              'to be fulfilled with value satisfying',
              {
                type: ERROR,
                error: {
                  code: ErrorCodes.MachineError,
                  errors: [
                    {
                      code: ErrorCodes.LifecycleError,
                      context: {stage: 'teardown'},
                    },
                  ],
                },
              },
            );
          });
        });
      });

      describe('state', function () {
        describe('readyingFilesystem', function () {
          let input: PkgManagerMachineInput;
          beforeEach(async function () {
            input = {
              def,
              executor: nullExecutor,
              plugin: plugin.toJSON(),
              fileManager,
              index: 0,
              parentRef: rootActor,
              ruleConfigs: smokerOptions.rules,
              signal: new AbortController().signal,
              spec,
              useWorkspaces: false,
              workspaceInfo: [],
              shouldShutdown: true,
            };
          });

          describe('when temp dir creation is successful', function () {
            it('should run the "setup" lifecycle hook', async function () {
              await expect(
                runUntilSnapshot(
                  (snapshot) => snapshot.matches({startup: 'setupLifecycle'}),
                  input,
                ),
                'to be fulfilled',
              );
            });

            it('should exit without error', async function () {
              await expect(
                runMachine(input),
                'to be fulfilled with value satisfying',
                {
                  type: OK,
                },
              );
            });
          });

          describe('when temp dir creation fails', function () {
            beforeEach(function () {
              sandbox
                .stub(fileManager, 'createTempDir')
                .rejects(new Error('temp dir creation failed'));
            });

            it('should skip the "setup" lifecycle hook', async function () {
              await expect(
                runUntilSnapshot(
                  (snapshot) => snapshot.matches({startup: 'setupLifecycle'}),
                  input,
                ),
                'to be rejected',
              );
            });

            it('should skip the "teardown" lifecycle hook', async function () {
              await expect(
                runUntilSnapshot(
                  (snapshot) =>
                    snapshot.matches({shutdown: 'teardownLifecycle'}),
                  input,
                ),
                'to be rejected',
              );
            });

            it('should exit with an error', async function () {
              await expect(
                runMachine(input),
                'to be fulfilled with value satisfying',
                {
                  type: ERROR,
                  error: {
                    code: ErrorCodes.MachineError,
                    errors: [
                      {
                        code: ErrorCodes.TempDirError,
                      },
                    ],
                  },
                },
              );
            });
          });
        });

        describe('working', function () {
          const workspaceInfo = {
            pkgName: 'bar',
            pkgJson: {name: 'bar', version: '1.0.0'},
            pkgJsonPath: '/package.json',
            localPath: '/',
          } as WorkspaceInfo;

          let input: PkgManagerMachineInput;

          beforeEach(async function () {
            input = {
              def,
              executor: nullExecutor,
              plugin: plugin.toJSON(),
              fileManager,
              index: 0,
              parentRef: rootActor,
              ruleConfigs: smokerOptions.rules,
              signal: new AbortController().signal,
              spec,
              useWorkspaces: false,
              workspaceInfo: [],
              shouldShutdown: true,
            };
          });

          describe('when additional deps are provided', function () {
            describe('when workspaceInfo is empty', function () {
              it('should not attempt to install additional deps', async function () {
                await expect(
                  runUntilSnapshot(
                    (snapshot) =>
                      snapshot.matches({
                        working: {installing: {installingPkgs: 'installPkg'}},
                      }),
                    {...input, additionalDeps: ['foo@1.0.0']},
                  ),
                  'to be rejected',
                );
              });
            });

            describe('when workspaceInfo is nonempty', function () {
              it('should install additional deps immediately', async function () {
                await expect(
                  runUntilSnapshot(
                    (snapshot) =>
                      snapshot.matches({
                        working: {installing: {installingPkgs: 'installPkg'}},
                      }),
                    {
                      ...input,
                      additionalDeps: ['foo@1.0.0'],
                      workspaceInfo: [workspaceInfo],
                    },
                  ),
                  'to be fulfilled with value satisfying',
                  {
                    context: {
                      currentInstallJob: {
                        installManifest: {pkgSpec: 'foo@1.0.0'},
                      },
                    },
                  },
                );
              });
            });
          });

          describe('packing', function () {
            describe('packingPkgs', function () {
              it('should send pack events in order', async function () {
                await expect(
                  runUntilEvent(
                    [
                      'PACK.PKG_MANAGER_PACK_BEGIN',
                      'PACK.PKG_PACK_BEGIN',
                      'PACK.PKG_PACK_OK',
                      'PACK.PKG_MANAGER_PACK_OK',
                    ],
                    {
                      ...input,
                      workspaceInfo: [workspaceInfo],
                    },
                  ),
                  'to be fulfilled',
                );
              });
            });
          });

          describe('installing', function () {
            describe('installingPkgs', function () {
              describe('installPkg', function () {
                it('should send install events in order', async function () {
                  await expect(
                    runUntilEvent(
                      [
                        'INSTALL.PKG_MANAGER_INSTALL_BEGIN',
                        'INSTALL.PKG_INSTALL_BEGIN',
                        'INSTALL.PKG_INSTALL_OK',
                        'INSTALL.PKG_MANAGER_INSTALL_OK',
                      ],
                      {
                        ...input,
                        workspaceInfo: [workspaceInfo],
                      },
                    ),
                    'to be fulfilled',
                  );
                });
              });
            });
          });

          describe('linting', function () {
            describe('when "shouldLint" flag not set', function () {
              it('should not lint', async function () {
                await expect(
                  runUntilSnapshot(
                    (snapshot) =>
                      snapshot.matches({working: {linting: 'lintingPkgs'}}),
                    {
                      ...input,
                      workspaceInfo: [workspaceInfo],
                    },
                  ),
                  'to be rejected',
                );
              });
            });
            describe('when "shouldLint" flag is set and rules are enabled', function () {
              it('should lint', async function () {
                await expect(
                  runUntilEvent('LINT.PKG_MANAGER_LINT_OK', {
                    ...input,
                    shouldLint: true,
                    ruleInitPayloads,
                    workspaceInfo: [workspaceInfo],
                  }),
                  'to be fulfilled',
                );
              });
            });

            describe('when "shouldLint" flag is set and rules are disabled', function () {
              it('should not lint', async function () {
                await expect(
                  runUntilEvent('LINT.PKG_MANAGER_LINT_OK', {
                    ...input,
                    shouldLint: true,
                    workspaceInfo: [workspaceInfo],
                  }),
                  'to be rejected',
                );
              });
            });
          });
        });
      });
    });
  });
});
