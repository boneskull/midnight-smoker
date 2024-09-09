import {
  ERROR,
  FAILED,
  InstallEvents,
  LintEvents,
  OK,
  PackEvents,
  ScriptEvents,
  SKIPPED,
} from '#constants';
import {ErrorCode} from '#error/codes';
import {ScriptFailedError} from '#error/script-failed-error';
import {
  PkgManagerMachine,
  type PkgManagerMachineInput,
} from '#machine/pkg-manager-machine';
import {OptionsParser} from '#options/options-parser';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {
  type PkgManagerEnvelope,
  type RuleEnvelope,
} from '#plugin/component-envelope';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {PluginRegistry} from '#plugin/registry';
import {type Executor} from '#schema/executor';
import {type PkgManager} from '#schema/pkg-manager';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {type RunScriptResultFailed} from '#schema/run-script-result';
import {type SmokerOptions} from '#schema/smoker-options';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {FileManager} from '#util/filemanager';
import {serialize} from '#util/serialize';
import stringify from 'json-stable-stringify';
import {set} from 'lodash';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {
  type Actor,
  type AnyActorRef,
  createActor,
  createEmptyActor,
} from 'xstate';
import {
  runUntilDone,
  runUntilEventSent,
  runUntilSnapshot,
  runUntilTransition,
} from 'xstate-audition';

import {createDebug} from '../../debug';
import {nullExecutor, nullPkgManager, nullRule} from '../mocks/component';

const expect = unexpected.clone().use(unexpectedSinon);
const logger = createDebug(__filename);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('PkgManagerMachine', function () {
      let executor: Executor;
      let plugin: Readonly<PluginMetadata>;
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      let smokerOptions: SmokerOptions;
      let sandbox: sinon.SinonSandbox;
      let pkgManager: PkgManager;
      let parentRef: AnyActorRef;
      let spec: PkgManagerSpec;
      let setup: sinon.SinonStub;
      let teardown: sinon.SinonStub;
      let ruleEnvelopes: RuleEnvelope[];
      let envelope: PkgManagerEnvelope;
      let actor: Actor<typeof PkgManagerMachine>;
      const id = 'PkgManagerMachine';

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({
          fileManager,
        });
        sandbox = createSandbox();
        pkgManager = {...nullPkgManager};
        plugin = await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.definePackageManager(pkgManager);
            api.defineRule({...nullRule});
          },
        });
        executor = nullExecutor.bind(null);
        smokerOptions = OptionsParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          reporter: 'test-plugin/test-reporter',
        });
        parentRef = createEmptyActor();
        setup = sandbox.stub(pkgManager, 'setup').resolves();
        teardown = sandbox.stub(pkgManager, 'teardown').resolves();
        spec = PkgManagerSpec.create('nullpm@1.0.0');
        ruleEnvelopes = plugin.rules.map((rule) => {
          const id = pluginRegistry.getComponentId(rule);
          return {
            config: smokerOptions.rules[id],
            id,
            plugin,
            rule,
          };
        });
        envelope = {
          id: 'test-plugin/nullpm',
          pkgManager,
          plugin: serialize(plugin),
          spec,
        };
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('lifecycle hooks', function () {
        let input: PkgManagerMachineInput;

        beforeEach(async function () {
          input = {
            envelope,
            executor,
            fileManager,
            immediate: true,
            parentRef,
            ruleConfigs: smokerOptions.rules,
            shouldShutdown: true,
            useWorkspaces: false,
            workspaceInfo: [
              {
                localPath: '/bar',
                pkgJson: {name: 'bar', version: '1.0.0'},
                pkgJsonPath: '/package.json',
                pkgName: 'bar',
                rawPkgJson: stringify({name: 'bar', version: '1.0.0'}),
              },
            ],
          };
          actor = createActor(PkgManagerMachine, {id, input, logger});
        });

        it('should call the "setup" lifecycle hook', async function () {
          await runUntilDone(actor);
          expect(pkgManager.setup, 'was called once');
        });

        describe('when the "setup" hook rejects', function () {
          beforeEach(function () {
            setup.rejects(new Error('setup failed'));
          });

          it('should call the "teardown" lifecycle hook', async function () {
            await runUntilDone(actor);
            expect(pkgManager.teardown, 'was called once');
          });

          it('should output with a MachineError and aborted flag', async function () {
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                aborted: true,
                error: {
                  code: ErrorCode.MachineError,
                  errors: [
                    {
                      code: ErrorCode.LifecycleError,
                      context: {stage: 'setup'},
                    },
                  ],
                },
                type: ERROR,
              },
            );
          });
        });

        describe('when not in immediate mode', function () {
          it('should not transition from initial state (.idle) to .startup', async function () {
            actor = createActor(PkgManagerMachine, {
              id,
              input: {...input, immediate: false},
              logger,
            });
            await expect(
              runUntilTransition(
                actor,
                'PkgManagerMachine.idle',
                'PkgManagerMachine.startup',
              ),
              'to be rejected',
            );
          });

          describe('when "BEGIN" received', function () {
            it('should transition from initial state (.idle) to .startup', async function () {
              actor = createActor(PkgManagerMachine, {
                id,
                input: {...input, immediate: false},
                logger,
              });
              const p = runUntilTransition(
                actor,
                'PkgManagerMachine.idle',
                'PkgManagerMachine.startup',
              );
              actor.send({type: 'BEGIN'});
              await expect(p, 'to be fulfilled');
            });
          });
        });

        it('should call the "teardown" lifecycle hook', async function () {
          await runUntilDone(actor);
          expect(pkgManager.teardown, 'was called once');
        });

        describe('when the "teardown" hook rejects', function () {
          beforeEach(function () {
            teardown.rejects(new Error('teardown failed'));
          });

          it('should output with a MachineError', async function () {
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  code: ErrorCode.MachineError,
                  errors: [
                    {
                      code: ErrorCode.LifecycleError,
                      context: {stage: 'teardown'},
                    },
                  ],
                },
                type: ERROR,
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
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  error: {
                    code: ErrorCode.MachineError,
                    errors: [
                      {
                        code: ErrorCode.CleanupError,
                      },
                      {
                        code: ErrorCode.LifecycleError,
                        context: {stage: 'teardown'},
                      },
                    ],
                  },
                  type: ERROR,
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
              envelope,
              executor,
              fileManager,
              immediate: true,
              parentRef,
              ruleConfigs: smokerOptions.rules,
              shouldShutdown: true,
              useWorkspaces: false,
              workspaceInfo: [
                {
                  localPath: '/bar',
                  pkgJson: {name: 'bar', version: '1.0.0'},
                  pkgJsonPath: '/package.json',
                  pkgName: 'bar',
                  rawPkgJson: stringify({name: 'bar', version: '1.0.0'}),
                },
              ],
            };
          });

          describe('when temp dir creation is successful', function () {
            beforeEach(function () {
              actor = createActor(PkgManagerMachine, {id, input, logger});
            });

            it('should run the "setup" lifecycle hook', async function () {
              await expect(
                runUntilSnapshot(actor, (snapshot) =>
                  snapshot.matches({startup: 'setupLifecycle'}),
                ),
                'to be fulfilled',
              );
            });

            it('should exit without error', async function () {
              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  type: OK,
                },
              );
            });
          });

          describe('when "workspaceInfo" is an empty array', function () {
            it('should exit immediately with {noop: true}', async function () {
              actor = createActor(PkgManagerMachine, {
                id,
                input: {...input, workspaceInfo: []},
                logger,
              });
              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  noop: true,
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
              actor = createActor(PkgManagerMachine, {id, input, logger});
            });

            it('should skip the "setup" lifecycle hook', async function () {
              await expect(
                runUntilSnapshot(actor, (snapshot) =>
                  snapshot.matches({startup: 'setupLifecycle'}),
                ),
                'to be rejected',
              );
            });

            it('should skip the "teardown" lifecycle hook', async function () {
              await expect(
                runUntilSnapshot(actor, (snapshot) =>
                  snapshot.matches({shutdown: 'teardownLifecycle'}),
                ),
                'to be rejected',
              );
            });

            it('should exit with an error', async function () {
              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  error: {
                    code: ErrorCode.MachineError,
                    errors: [
                      {
                        code: ErrorCode.TempDirError,
                      },
                    ],
                  },
                  type: ERROR,
                },
              );
            });
          });
        });

        describe('working', function () {
          const workspaceInfo = {
            localPath: '/bar',
            pkgJson: {name: 'bar', version: '1.0.0'},
            pkgJsonPath: '/package.json',
            pkgName: 'bar',
          } as WorkspaceInfo;

          let input: PkgManagerMachineInput;

          beforeEach(async function () {
            input = {
              envelope,
              executor,
              fileManager,
              immediate: true,
              parentRef,
              ruleConfigs: smokerOptions.rules,
              shouldShutdown: true,
              useWorkspaces: false,
              workspaceInfo: [workspaceInfo],
            };
          });

          describe('when additional deps are provided', function () {
            describe('when workspaceInfo is empty', function () {
              it('should not attempt to install additional deps', async function () {
                actor = createActor(PkgManagerMachine, {
                  id,
                  input: {
                    ...input,
                    additionalDeps: ['foo@1.0.0'],
                    workspaceInfo: [],
                  },
                  logger,
                });
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({
                      working: {installing: {installingPkgs: 'installPkg'}},
                    }),
                  ),
                  'to be rejected',
                );
              });
            });

            describe('when workspaceInfo is nonempty', function () {
              it('should install additional deps immediately', async function () {
                actor = createActor(PkgManagerMachine, {
                  id,
                  input: {
                    ...input,
                    additionalDeps: ['foo@1.0.0'],
                  },
                  logger,
                });
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({
                      working: {installing: {installingPkgs: 'installPkg'}},
                    }),
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
            beforeEach(function () {
              actor = createActor(PkgManagerMachine, {id, input, logger});
            });

            describe('packingPkgs', function () {
              it('should send expected events in order', async function () {
                await expect(
                  runUntilEventSent(actor, [
                    PackEvents.PkgManagerPackBegin,
                    PackEvents.PkgPackBegin,
                    PackEvents.PkgPackOk,
                    PackEvents.PkgManagerPackOk,
                  ]),
                  'to be fulfilled',
                );
              });

              describe('when packing fails', function () {
                beforeEach(function () {
                  pkgManager.pack = sandbox
                    .stub()
                    .rejects(new Error('packing BAD'));
                  actor = createActor(PkgManagerMachine, {
                    id,
                    input,
                    logger,
                  });
                });

                it('should send PACK.PKG.FAILED and PACK.PKG_MANAGER.FAILE events', async function () {
                  await expect(
                    runUntilEventSent(actor, [
                      PackEvents.PkgManagerPackBegin,
                      PackEvents.PkgPackBegin,
                      PackEvents.PkgPackFailed,
                      PackEvents.PkgManagerPackFailed,
                    ]),
                    'to be fulfilled',
                  );
                });

                it('should output with a MachineError and aborted flag', async function () {
                  actor = createActor(PkgManagerMachine, {
                    id,
                    input: {...input, workspaceInfo: [workspaceInfo]},
                    logger,
                  });

                  await expect(
                    runUntilDone(actor),
                    'to be fulfilled with value satisfying',
                    {
                      aborted: true,
                      error: {
                        code: ErrorCode.MachineError,
                        errors: [
                          {
                            cause: {message: 'packing BAD'},
                            code: ErrorCode.PackError,
                          },
                        ],
                      },
                      type: ERROR,
                    },
                  );
                });
              });
            });
          });

          describe('installing', function () {
            beforeEach(function () {
              actor = createActor(PkgManagerMachine, {id, input, logger});
            });

            describe('installingPkgs', function () {
              describe('installPkg', function () {
                it('should send install events in order', async function () {
                  await expect(
                    runUntilEventSent(actor, [
                      InstallEvents.PkgManagerInstallBegin,
                      InstallEvents.PkgInstallBegin,
                      InstallEvents.PkgInstallOk,
                      InstallEvents.PkgManagerInstallOk,
                    ]),
                    'to be fulfilled',
                  );
                });

                describe('when installation fails', function () {
                  beforeEach(function () {
                    pkgManager.install = sandbox
                      .stub()
                      .rejects(new Error('install BAD'));
                    actor = createActor(PkgManagerMachine, {
                      id,
                      input,
                      logger,
                    });
                  });

                  it('should send INSTALL.PKG.FAILED and INSTALL.PKG_MANAGER.FAILED events', async function () {
                    await expect(
                      runUntilEventSent(actor, [
                        InstallEvents.PkgManagerInstallBegin,
                        InstallEvents.PkgInstallBegin,
                        InstallEvents.PkgInstallFailed,
                        InstallEvents.PkgManagerInstallFailed,
                      ]),
                      'to be fulfilled',
                    );
                  });

                  it('should output with a MachineError and aborted flag', async function () {
                    actor = createActor(PkgManagerMachine, {
                      id,
                      input: {...input, workspaceInfo: [workspaceInfo]},
                      logger,
                    });
                    await expect(
                      runUntilDone(actor),
                      'to be fulfilled with value satisfying',
                      {
                        aborted: true,
                        error: {
                          code: ErrorCode.MachineError,
                          errors: [
                            {
                              cause: {message: 'install BAD'},
                              code: ErrorCode.InstallError,
                            },
                          ],
                        },
                        type: ERROR,
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
                [path.join(tmpdir, 'node_modules', 'bar', 'package.json')]:
                  JSON.stringify({name: 'bar', version: '1.0.0'}),
              });
            });

            describe('when "shouldLint" flag not set', function () {
              it('should not lint', async function () {
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({working: {linting: 'lintingPkgs'}}),
                  ),
                  'to be rejected',
                );
              });
            });

            describe('when "shouldLint" flag is set and rules are enabled', function () {
              beforeEach(function () {
                input = {
                  ...input,
                  ruleEnvelopes,
                  shouldLint: true,
                };
                actor = createActor(PkgManagerMachine, {
                  id,
                  input,
                  logger,
                });
              });

              it('should send lint events in order', async function () {
                await expect(
                  runUntilEventSent(actor, [
                    LintEvents.PkgManagerLintBegin,
                    LintEvents.RuleBegin,
                    LintEvents.RuleOk,
                    LintEvents.RuleEnd,
                    LintEvents.PkgManagerLintOk,
                  ]),
                  'to be fulfilled',
                );
              });

              describe('when a rule fails', function () {
                beforeEach(function () {
                  for (const {rule} of ruleEnvelopes) {
                    sandbox.stub(rule, 'check').callsFake(async (ctx) => {
                      ctx.addIssue('PROBLEM');
                    });
                  }
                  actor = createActor(PkgManagerMachine, {
                    id,
                    input,
                    logger,
                  });
                });

                it('should send lint events in order', async function () {
                  await expect(
                    runUntilEventSent(actor, [
                      LintEvents.PkgManagerLintBegin,
                      LintEvents.RuleBegin,
                      LintEvents.RuleFailed,
                      LintEvents.RuleEnd,
                      LintEvents.PkgManagerLintFailed,
                    ]),
                    'to be fulfilled',
                  );
                });

                it('should output with type OK', async function () {
                  await expect(
                    runUntilDone(actor),
                    'to be fulfilled with value satisfying',
                    {
                      type: OK,
                    },
                  );
                });
              });

              describe('when a rule throws an exception', function () {
                beforeEach(function () {
                  for (const {rule} of ruleEnvelopes) {
                    sandbox.stub(rule, 'check').throws(new Error('test error'));
                  }
                  actor = createActor(PkgManagerMachine, {
                    id,
                    input,
                    logger,
                  });
                });

                it('should send lint events in order', async function () {
                  await expect(
                    runUntilEventSent(actor, [
                      LintEvents.PkgManagerLintBegin,
                      LintEvents.RuleBegin,
                      LintEvents.RuleError,
                      LintEvents.RuleEnd,
                      LintEvents.PkgManagerLintFailed,
                    ]),
                    'to be fulfilled',
                  );
                });
              });
            });

            describe('when "shouldLint" flag is set but all rules are disabled', function () {
              // NOTE: ComponentLoaderMachine would normally filter the rules based on their severity, and only enabled rule defs would be provided. thus, PkgManagerMachine does not check the rule config; it only checks if it has any rule defs.
              it('should not lint', async function () {
                actor = createActor(PkgManagerMachine, {
                  id,
                  input: {...input, ruleEnvelopes: [], shouldLint: true},
                  logger,
                });

                await expect(
                  runUntilEventSent(actor, [LintEvents.PkgManagerLintBegin]),
                  'to be rejected',
                );
              });
            });
          });

          describe('runningScripts', function () {
            describe('when no scripts were provided in SmokerOptions', function () {
              it('should not enter state working.runningScripts.running', async function () {
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({working: {runningScripts: 'running'}}),
                  ),
                  'to be rejected',
                );
              });
            });

            describe('when scripts were provided in SmokerOptions', function () {
              beforeEach(function () {
                set(input, 'scripts', ['test']);
                actor = createActor(PkgManagerMachine, {
                  id,
                  input,
                  logger,
                });
              });

              it('should enter state working.runningScripts.running', async function () {
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({working: {runningScripts: 'running'}}),
                  ),
                  'to be fulfilled',
                );
              });

              describe('when a script was skipped', function () {
                beforeEach(function () {
                  sandbox.stub(pkgManager, 'runScript').resolves({
                    manifest: {} as RunScriptManifest,
                    type: SKIPPED,
                  });
                });

                it('should send the correct events', async function () {
                  await expect(
                    runUntilEventSent(actor, [
                      ScriptEvents.PkgManagerRunScriptsBegin,
                      ScriptEvents.RunScriptBegin,
                      ScriptEvents.RunScriptSkipped,
                      ScriptEvents.RunScriptEnd,
                      ScriptEvents.PkgManagerRunScriptsOk,
                    ]),
                    'to be fulfilled',
                  );
                });
              });

              describe('when a script failed', function () {
                beforeEach(function () {
                  const result: RunScriptResultFailed = {
                    error: new ScriptFailedError('failed', {
                      command: '',
                      exitCode: 1,
                      output: '',
                      pkgManager: 'nullpm',
                      pkgName: workspaceInfo.pkgName,
                      script: 'test',
                    }),
                    manifest: {} as RunScriptManifest,
                    rawResult: {
                      command: '',
                      escapedCommand: '',
                      exitCode: 0,
                      failed: false,
                      isCanceled: false,
                      killed: false,
                      stderr: '',
                      stdout: '',
                      timedOut: false,
                    },
                    type: FAILED,
                  };
                  sandbox.stub(pkgManager, 'runScript').resolves(result);
                });

                it('should send the correct events', async function () {
                  await expect(
                    runUntilEventSent(actor, [
                      ScriptEvents.PkgManagerRunScriptsBegin,
                      ScriptEvents.RunScriptBegin,
                      ScriptEvents.RunScriptFailed,
                      ScriptEvents.RunScriptEnd,
                      ScriptEvents.PkgManagerRunScriptsFailed,
                    ]),
                    'to be fulfilled',
                  );
                });
              });

              describe('when a script succeeds', function () {
                it('should send the correct events', async function () {
                  await expect(
                    runUntilEventSent(actor, [
                      ScriptEvents.PkgManagerRunScriptsBegin,
                      ScriptEvents.RunScriptBegin,
                      ScriptEvents.RunScriptOk,
                      ScriptEvents.RunScriptEnd,
                      ScriptEvents.PkgManagerRunScriptsOk,
                    ]),
                    'to be fulfilled',
                  );
                });
              });

              describe('when a the script runner throws an error', function () {
                beforeEach(function () {
                  sandbox
                    .stub(pkgManager, 'runScript')
                    .rejects(new Error('dook dook dook'));
                });

                it('should send the correct events', async function () {
                  await expect(
                    runUntilEventSent(actor, [
                      ScriptEvents.PkgManagerRunScriptsBegin,
                      ScriptEvents.RunScriptBegin,
                      ScriptEvents.RunScriptError,
                      ScriptEvents.RunScriptEnd,
                      ScriptEvents.PkgManagerRunScriptsFailed,
                    ]),
                    'to be fulfilled',
                  );
                });

                it('should bail', async function () {
                  await expect(
                    runUntilTransition(
                      actor,
                      'PkgManagerMachine.working.runningScripts.running',
                      'PkgManagerMachine.working.runningScripts.errored',
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
            localPath: '/',
            pkgJson: {name: 'bar', version: '1.0.0'},
            pkgJsonPath: '/package.json',
            pkgName: 'bar',
          } as WorkspaceInfo;
          let input: PkgManagerMachineInput;

          beforeEach(function () {
            input = {
              envelope,
              executor,
              fileManager,
              immediate: true,
              parentRef,
              ruleConfigs: smokerOptions.rules,
              shouldShutdown: true,
              useWorkspaces: false,
              workspaceInfo: [workspaceInfo],
            };
          });

          describe('when pruning the temp dir fails', function () {
            beforeEach(function () {
              sandbox
                .stub(fileManager, 'pruneTempDir')
                .rejects(new Error('prune failed'));
              actor = createActor(PkgManagerMachine, {id, input, logger});
            });

            it('should output with a MachineError', async function () {
              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  error: {
                    code: ErrorCode.MachineError,
                    errors: [
                      {
                        code: ErrorCode.CleanupError,
                      },
                    ],
                  },
                  type: ERROR,
                },
              );
            });
          });

          describe('when the "linger" flag was provided', function () {
            beforeEach(function () {
              input = {...input, linger: true};
              actor = createActor(PkgManagerMachine, {id, input, logger});
            });

            it('should send the LINGERED event', async function () {
              await expect(
                runUntilEventSent(actor, ['LINGERED']),
                'to be fulfilled',
              );
            });
          });
        });
      });
    });
  });
});
