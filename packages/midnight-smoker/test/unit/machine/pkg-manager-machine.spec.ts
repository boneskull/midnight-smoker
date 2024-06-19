import {ERROR, FAILED, OK, SKIPPED} from '#constants';
import {ErrorCodes} from '#error/codes';
import {ScriptFailedError} from '#error/script-failed-error';
import {type RuleInitPayload} from '#machine/payload';
import {
  PkgManagerMachine,
  type PkgManagerMachineInput,
} from '#machine/pkg-manager';
import {OptionsParser} from '#options/options-parser';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {PluginRegistry} from '#plugin/plugin-registry';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {type RunScriptResultFailed} from '#schema/run-script-result';
import {type SmokerOptions} from '#schema/smoker-options';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {FileManager} from '#util/filemanager';
import {serialize} from '#util/serialize';
import Debug from 'debug';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createEmptyActor, type AnyActorRef} from 'xstate';
import {nullExecutor, nullPkgManagerDef, nullRule} from '../mocks/component';
import {createActorRunner} from './actor-helpers';

const debug = Debug('midnight-smoker:test:pkg-manager-machine');
const expect = unexpected.clone().use(unexpectedSinon);

const {runUntilSnapshot, runUntilTransition, runUntilDone, runUntilEvent} =
  createActorRunner(PkgManagerMachine, {
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
        smokerOptions = OptionsParser.buildSmokerOptionsSchema(
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
          };
        });

        it('should call the "setup" lifecycle hook', async function () {
          await runUntilDone(input);
          expect(def.setup, 'was called once');
        });

        describe('when the "setup" hook rejects', function () {
          beforeEach(function () {
            setup.rejects(new Error('setup failed'));
          });

          it('should call the "teardown" lifecycle hook', async function () {
            await runUntilDone(input);
            expect(def.teardown, 'was called once');
          });

          it('should output with a MachineError and aborted flag', async function () {
            await expect(
              runUntilDone(input),
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
                aborted: true,
              },
            );
          });
        });

        it('should call the "teardown" lifecycle hook', async function () {
          await runUntilDone(input);
          expect(def.teardown, 'was called once');
        });

        describe('when the "teardown" hook rejects', function () {
          beforeEach(function () {
            teardown.rejects(new Error('teardown failed'));
          });

          it('should output with a MachineError', async function () {
            await expect(
              runUntilDone(input),
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

          describe('when the pruneTempDir actor also rejects', function () {
            beforeEach(function () {
              sandbox
                .stub(fileManager, 'pruneTempDir')
                .rejects(new Error('prune failed'));
            });

            it('should output with a MachineError containing both errors', async function () {
              await expect(
                runUntilDone(input),
                'to be fulfilled with value satisfying',
                {
                  type: ERROR,
                  error: {
                    code: ErrorCodes.MachineError,
                    errors: [
                      {
                        code: ErrorCodes.CleanupError,
                      },
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
      });

      describe('state', function () {
        describe('init', function () {
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
                runUntilDone(input),
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
                runUntilDone(input),
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
              plugin: staticPlugin,
              fileManager,
              parentRef,
              ruleConfigs: smokerOptions.rules,
              spec,
              useWorkspaces: false,
              workspaceInfo: [workspaceInfo],
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
                    {
                      ...input,
                      additionalDeps: ['foo@1.0.0'],
                      workspaceInfo: [],
                    },
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
                      },
                    ),
                    'to be fulfilled',
                  );
                });

                it('should output with a MachineError and aborted flag', async function () {
                  await expect(
                    runUntilDone({...input, workspaceInfo: [workspaceInfo]}),
                    'to be fulfilled with value satisfying',
                    {
                      type: ERROR,
                      error: {
                        code: ErrorCodes.MachineError,
                        errors: [
                          {
                            code: ErrorCodes.PackError,
                            cause: {message: 'packing BAD'},
                          },
                        ],
                      },
                      aborted: true,
                    },
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
                        },
                      ),
                      'to be fulfilled',
                    );
                  });

                  it('should output with a MachineError and aborted flag', async function () {
                    await expect(
                      runUntilDone({...input, workspaceInfo: [workspaceInfo]}),
                      'to be fulfilled with value satisfying',
                      {
                        type: ERROR,
                        error: {
                          code: ErrorCodes.MachineError,
                          errors: [
                            {
                              code: ErrorCodes.InstallError,
                              cause: {message: 'install BAD'},
                            },
                          ],
                        },
                        aborted: true,
                      },
                    );
                  });
                });
              });
            });
          });

          describe('linting', function () {
            const tmpdir = '/tmp';
            beforeEach(function () {
              // configure filesystem for an installed package
              // within the temp dir.  this is needed for reading the
              // package.json at the install path of the tarballed workspace
              sandbox.stub(fileManager, 'createTempDir').resolves(tmpdir);
              vol.fromJSON({
                [path.join(tmpdir, 'node_modules', 'foo', 'package.json')]:
                  JSON.stringify({name: 'foo', version: '1.0.0'}),
              });
            });
            describe('when "shouldLint" flag not set', function () {
              it('should not lint', async function () {
                await expect(
                  runUntilSnapshot(
                    (snapshot) =>
                      snapshot.matches({working: {linting: 'lintingPkgs'}}),
                    {
                      ...input,
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
                };
              });

              it('should send lint events in order', async function () {
                await expect(
                  runUntilEvent(
                    [
                      'LINT.PKG_MANAGER_LINT_BEGIN',
                      'LINT.RULE_BEGIN',
                      'LINT.RULE_OK',
                      'LINT.RULE_END',
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
                        'LINT.RULE_END',
                        'LINT.PKG_MANAGER_LINT_FAILED',
                      ],
                      input,
                    ),
                    'to be fulfilled',
                  );
                });

                it('should output with type OK', async function () {
                  await expect(
                    runUntilDone(input),
                    'to be fulfilled with value satisfying',
                    {
                      type: OK,
                    },
                  );
                });
              });

              describe('when a rule throws an exception', function () {
                beforeEach(function () {
                  for (const {def} of ruleInitPayloads) {
                    sandbox.stub(def, 'check').throws(new Error('test error'));
                  }
                });

                it('should send lint events in order', async function () {
                  await expect(
                    runUntilEvent(
                      [
                        'LINT.PKG_MANAGER_LINT_BEGIN',
                        'LINT.RULE_BEGIN',
                        'LINT.RULE_ERROR',
                        'LINT.RULE_END',
                        'LINT.PKG_MANAGER_LINT_FAILED',
                      ],
                      input,
                    ),
                    'to be fulfilled',
                  );
                });
              });
            });

            describe('when "shouldLint" flag is set but all rules are disabled', function () {
              // NOTE: PluginLoaderMachine would normally filter the rules based on their severity, and only enabled rule defs would be provided. thus, PkgManagerMachine does not check the rule config; it only checks if it has any rule defs.
              it('should not lint', async function () {
                await expect(
                  runUntilEvent(['LINT.PKG_MANAGER_LINT_BEGIN'], {
                    ...input,
                    ruleInitPayloads: [],
                    shouldLint: true,
                  }),
                  'to be rejected',
                );
              });
            });
          });

          describe('runningScripts', function () {
            describe('when no scripts were provided in SmokerOptions', function () {
              it('should not enter state working.runningScripts.running', async function () {
                await expect(
                  runUntilSnapshot(
                    (snapshot) =>
                      snapshot.matches({working: {runningScripts: 'running'}}),
                    {
                      ...input,
                    },
                  ),
                  'to be rejected',
                );
              });
            });

            describe('when scripts were provided in SmokerOptions', function () {
              it('should enter state working.runningScripts.running', async function () {
                await expect(
                  runUntilSnapshot(
                    (snapshot) =>
                      snapshot.matches({working: {runningScripts: 'running'}}),
                    {
                      ...input,
                      scripts: ['test'],
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

                it('should send the correct events', async function () {
                  await expect(
                    runUntilEvent(
                      [
                        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
                        'SCRIPT.RUN_SCRIPT_BEGIN',
                        'SCRIPT.RUN_SCRIPT_SKIPPED',
                        'SCRIPT.RUN_SCRIPT_END',
                        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK',
                      ],
                      {
                        ...input,
                        scripts: ['test'],
                      },
                    ),
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

                it('should send the correct events', async function () {
                  await expect(
                    runUntilEvent(
                      [
                        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
                        'SCRIPT.RUN_SCRIPT_BEGIN',
                        'SCRIPT.RUN_SCRIPT_FAILED',
                        'SCRIPT.RUN_SCRIPT_END',
                        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED',
                      ],
                      {
                        ...input,
                        scripts: ['test'],
                      },
                    ),
                    'to be fulfilled',
                  );
                });
              });

              describe('when a script succeeds', function () {
                it('should send the correct events', async function () {
                  await expect(
                    runUntilEvent(
                      [
                        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
                        'SCRIPT.RUN_SCRIPT_BEGIN',
                        'SCRIPT.RUN_SCRIPT_OK',
                        'SCRIPT.RUN_SCRIPT_END',
                        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK',
                      ],
                      {
                        ...input,
                        scripts: ['test'],
                      },
                    ),
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

                it('should send the correct events', async function () {
                  await expect(
                    runUntilEvent(
                      [
                        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
                        'SCRIPT.RUN_SCRIPT_BEGIN',
                        'SCRIPT.RUN_SCRIPT_ERROR',
                        'SCRIPT.RUN_SCRIPT_END',
                        'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED',
                      ],
                      {
                        ...input,
                        scripts: ['test'],
                      },
                    ),
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
                      },
                    ),
                    'to be fulfilled',
                  );
                });
              });
            });
          });
        });

        describe('shutdown', function () {
          const workspaceInfo = {
            pkgName: 'bar',
            pkgJson: {name: 'bar', version: '1.0.0'},
            pkgJsonPath: '/package.json',
            localPath: '/',
          } as WorkspaceInfo;
          let input: PkgManagerMachineInput;

          beforeEach(function () {
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
            };
          });

          describe('when pruning the temp dir fails', function () {
            beforeEach(function () {
              sandbox
                .stub(fileManager, 'pruneTempDir')
                .rejects(new Error('prune failed'));
            });

            it('should output with a MachineError', async function () {
              await expect(
                runUntilDone(input),
                'to be fulfilled with value satisfying',
                {
                  type: ERROR,
                  error: {
                    code: ErrorCodes.MachineError,
                    errors: [
                      {
                        code: ErrorCodes.CleanupError,
                      },
                    ],
                  },
                },
              );
            });
          });

          describe('when the "linger" flag was provided', function () {
            beforeEach(function () {
              input = {...input, linger: true, workspaceInfo: [workspaceInfo]};
            });

            it('should send the LINGERED event', async function () {
              await expect(
                runUntilEvent(['LINGERED'], input),
                'to be fulfilled',
              );
            });
          });
        });
      });
    });
  });
});
