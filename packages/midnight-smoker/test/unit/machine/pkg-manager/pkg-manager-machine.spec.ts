import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import Debug from 'debug';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createEmptyActor, type AnyActorRef} from 'xstate';
import {ERROR, FAILED, OK, SKIPPED} from '../../../../src/constants';
import {ErrorCodes, ScriptFailedError} from '../../../../src/error';
import {type RuleInitPayload} from '../../../../src/machine/loader/loader-machine-types';
import {
  PkgManagerMachine,
  type PkgManagerMachineInput,
} from '../../../../src/machine/pkg-manager';
import {OptionParser, type SmokerOptions} from '../../../../src/options';
import {
  PkgManagerSpec,
  type PkgManagerDef,
  type RunScriptManifest,
  type RunScriptResultFailed,
  type WorkspaceInfo,
} from '../../../../src/pkg-manager';
import {type PluginMetadata} from '../../../../src/plugin';
import {PluginRegistry} from '../../../../src/plugin/plugin-registry';
import {FileManager} from '../../../../src/util/filemanager';
import {serialize} from '../../../../src/util/serialize';
import {nullExecutor, nullPkgManagerDef, nullRule} from '../../mocks/component';
import {createActorRunner} from '../actor-helpers';
const debug = Debug('midnight-smoker:test:pkg-manager-machine');
const expect = unexpected.clone().use(unexpectedSinon);

const {
  runUntilSnapshot,
  runUntilTransition,
  run: runMachine,
  runUntilEvent,
} = createActorRunner(PkgManagerMachine, {
  logger: debug,
});

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
      let parentRef: AnyActorRef;
      let spec: PkgManagerSpec;
      let setup: sinon.SinonStub;
      let teardown: sinon.SinonStub;
      let ruleInitPayloads: RuleInitPayload[];
      let staticPlugin: StaticPluginMetadata;
      let ac: AbortController;
      let signal: AbortSignal;

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({fileManager});
        sandbox = createSandbox();
        plugin = await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.definePackageManager(nullPkgManagerDef);
            api.defineRule(nullRule);
          },
        });
        def = {...nullPkgManagerDef};
        smokerOptions = OptionParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          reporter: 'test-plugin/test-reporter',
        });
        parentRef = createEmptyActor();
        setup = sandbox.stub(def, 'setup').resolves();
        teardown = sandbox.stub(def, 'teardown').resolves();
        spec = await PkgManagerSpec.from('nullpm@1.0.0');
        ruleInitPayloads = plugin.ruleDefs.map((def) => ({
          def,
          id: pluginRegistry.getComponentId(def),
          plugin,
        }));
        staticPlugin = serialize(plugin);
        ac = new AbortController();
        ({signal} = ac);
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
            plugin: staticPlugin,
            fileManager,
            parentRef,
            ruleConfigs: smokerOptions.rules,
            spec,
            useWorkspaces: false,
            workspaceInfo: [],
            shouldShutdown: true,
            signal,
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
              signal,
              def,
              executor: nullExecutor,
              plugin: staticPlugin,
              fileManager,
              parentRef,
              ruleConfigs: smokerOptions.rules,
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
              signal,
              def,
              executor: nullExecutor,
              plugin: staticPlugin,
              fileManager,
              parentRef,
              ruleConfigs: smokerOptions.rules,
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
                        pkgSpec: 'foo@1.0.0',
                      },
                    },
                  },
                );
              });
            });
          });

          describe('packing', function () {
            describe('packingPkgs', function () {
              it('should send expected events in order', async function () {
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

              describe('when packing fails', function () {
                beforeEach(function () {
                  def.pack = sandbox.stub().rejects(new Error('packing BAD'));
                });

                it('should send PKG_PACK_FAILED and PKG_MANAGER_PACK_FAILED events', async function () {
                  await expect(
                    runUntilEvent(
                      [
                        'PACK.PKG_MANAGER_PACK_BEGIN',
                        'PACK.PKG_PACK_BEGIN',
                        'PACK.PKG_PACK_FAILED',
                        'PACK.PKG_MANAGER_PACK_FAILED',
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

                describe('when installation fails', function () {
                  beforeEach(function () {
                    def.install = sandbox
                      .stub()
                      .rejects(new Error('install BAD'));
                  });

                  it('should send INSTALL.PKG_INSTALL_FAILED and INSTALL.PKG_MANAGER_INSTALL_FAILED events', async function () {
                    await expect(
                      runUntilEvent(
                        [
                          'INSTALL.PKG_MANAGER_INSTALL_BEGIN',
                          'INSTALL.PKG_INSTALL_BEGIN',
                          'INSTALL.PKG_INSTALL_FAILED',
                          'INSTALL.PKG_MANAGER_INSTALL_FAILED',
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
              beforeEach(function () {
                input = {
                  ...input,
                  shouldLint: true,
                  ruleInitPayloads,
                  workspaceInfo: [workspaceInfo],
                };
              });

              it('should send lint events in order', async function () {
                await expect(
                  runUntilEvent(
                    [
                      'LINT.PKG_MANAGER_LINT_BEGIN',
                      'LINT.RULE_BEGIN',
                      'LINT.RULE_OK',
                      'LINT.PKG_MANAGER_LINT_OK',
                    ],
                    input,
                  ),
                  'to be fulfilled',
                );
              });

              describe('when a rule fails', function () {
                beforeEach(function () {
                  for (const {def} of ruleInitPayloads) {
                    sandbox.stub(def, 'check').callsFake(async (ctx) => {
                      ctx.addIssue('PROBLEM');
                    });
                  }
                });

                it('should send lint events in order', async function () {
                  await expect(
                    runUntilEvent(
                      [
                        'LINT.PKG_MANAGER_LINT_BEGIN',
                        'LINT.RULE_BEGIN',
                        'LINT.RULE_FAILED',
                        'LINT.PKG_MANAGER_LINT_FAILED',
                      ],
                      input,
                    ),
                    'to be fulfilled',
                  );
                });
              });
            });

            describe('when "shouldLint" flag is set and rules are disabled', function () {
              it('should not lint', async function () {
                await expect(
                  runUntilEvent(['LINT.PKG_MANAGER_LINT_OK'], {
                    ...input,
                    shouldLint: true,
                    workspaceInfo: [workspaceInfo],
                  }),
                  'to be rejected',
                );
              });
            });
          });

          describe('runningScripts', function () {
            describe('when no scripts were provided in SmokerOptions', function () {
              it('should not run scripts', async function () {
                await expect(
                  runUntilSnapshot(
                    (snapshot) =>
                      snapshot.matches({working: {runningScripts: 'running'}}),
                    {
                      ...input,
                      workspaceInfo: [workspaceInfo],
                    },
                  ),
                  'to be rejected',
                );
              });
            });

            describe('when scripts were provided in SmokerOptions', function () {
              it('should run scripts', async function () {
                await expect(
                  runUntilSnapshot(
                    (snapshot) =>
                      snapshot.matches({working: {runningScripts: 'running'}}),
                    {
                      ...input,
                      scripts: ['test'],
                      workspaceInfo: [workspaceInfo],
                    },
                  ),
                  'to be fulfilled',
                );
              });

              it('should send script events in order', async function () {
                await expect(
                  runUntilEvent(
                    [
                      'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
                      'SCRIPT.RUN_SCRIPT_BEGIN',
                      'SCRIPT.RUN_SCRIPT_OK',
                      'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK',
                    ],
                    {
                      ...input,
                      scripts: ['test'],
                      workspaceInfo: [workspaceInfo],
                    },
                  ),
                  'to be fulfilled',
                );
              });

              describe('when a script was skipped', function () {
                beforeEach(function () {
                  sandbox.stub(def, 'runScript').resolves({
                    manifest: {} as RunScriptManifest,
                    type: SKIPPED,
                  });
                });

                it('should send the correct event', async function () {
                  await expect(
                    runUntilEvent(['SCRIPT.RUN_SCRIPT_SKIPPED'], {
                      ...input,
                      scripts: ['test'],
                      workspaceInfo: [workspaceInfo],
                    }),
                    'to be fulfilled',
                  );
                });
              });

              describe('when a script failed', function () {
                beforeEach(function () {
                  const result: RunScriptResultFailed = {
                    type: FAILED,
                    rawResult: {
                      exitCode: 1,
                      stdout: '',
                      stderr: '',
                      failed: true,
                      command: '',
                    },
                    manifest: {} as RunScriptManifest,
                    error: new ScriptFailedError('failed', {
                      script: 'test',
                      pkgName: workspaceInfo.pkgName,
                      command: '',
                      exitCode: 1,
                      pkgManager: 'nullpm',
                      output: '',
                    }),
                  };
                  sandbox.stub(def, 'runScript').resolves(result);
                });

                it('should send the correct event', async function () {
                  await expect(
                    runUntilEvent(['SCRIPT.RUN_SCRIPT_FAILED'], {
                      ...input,
                      scripts: ['test'],
                      workspaceInfo: [workspaceInfo],
                    }),
                    'to be fulfilled',
                  );
                });
              });

              describe('when a script succeeds', function () {
                it('should send the correct event', async function () {
                  await expect(
                    runUntilEvent(['SCRIPT.RUN_SCRIPT_OK'], {
                      ...input,
                      scripts: ['test'],
                      workspaceInfo: [workspaceInfo],
                    }),
                    'to be fulfilled',
                  );
                });
              });

              describe('when a the script runner throws an error', function () {
                beforeEach(function () {
                  sandbox
                    .stub(def, 'runScript')
                    .rejects(new Error('dook dook dook'));
                });

                it('should send the correct event', async function () {
                  await expect(
                    runUntilEvent(['SCRIPT.RUN_SCRIPT_ERROR'], {
                      ...input,
                      scripts: ['test'],
                      workspaceInfo: [workspaceInfo],
                    }),
                    'to be fulfilled',
                  );
                });

                it('should bail', async function () {
                  await expect(
                    runUntilTransition(
                      'PkgManagerMachine.working.runningScripts.running',
                      'PkgManagerMachine.working.runningScripts.errored',
                      {
                        ...input,
                        scripts: ['test'],
                        workspaceInfo: [workspaceInfo],
                      },
                    ),
                    'to be fulfilled',
                  );
                });
              });
            });
          });
        });
      });
    });
  });
});
