import {ERROR, Events, OK, PACKAGE_JSON} from '#constants';
import {ErrorCodes} from '#error/codes';
import {PkgManagerMachine} from '#machine/pkg-manager-machine';
import {PluginLoaderMachine} from '#machine/plugin-loader-machine';
import {ReporterMachine} from '#machine/reporter-machine';
import {SmokeMachine, type SmokeMachineInput} from '#machine/smoke-machine';
import {OptionsParser} from '#options/options-parser';
import {PluginRegistry} from '#plugin/plugin-registry';
import {type SmokerOptions} from '#schema/smoker-options';
import {FileManager} from '#util/filemanager';
import Debug from 'debug';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {beforeEach} from 'mocha';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {fromPromise} from 'xstate';
import {
  nullExecutor,
  nullPkgManagerDef,
  nullReporter,
  nullRule,
} from '../mocks/component';
import {createActorRunner, type StateMachineRunner} from './actor-helpers';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('SmokeMachine', function () {
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      let smokerOptions: SmokerOptions;
      let sandbox: sinon.SinonSandbox;
      let input: SmokeMachineInput;
      let runner: StateMachineRunner<typeof SmokeMachine>;

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        sandbox = createSandbox();
        pluginRegistry = PluginRegistry.create({fileManager});
        await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.definePackageManager(nullPkgManagerDef);
            api.defineRule(nullRule);
            api.defineReporter(nullReporter);
          },
        });
        smokerOptions = OptionsParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          reporter: 'test-plugin/test-reporter',
          pkgManager: 'nullpm@1.0.0',
          cwd: '/some-dir',
        });

        // XXX: does memfs care about windows?
        const root = path.resolve('/');
        const midnightSmokerPath = path.resolve(__dirname, '..', '..', '..');
        const midnightSmokerPkgJsonPath = path.join(
          midnightSmokerPath,
          PACKAGE_JSON,
        );

        vol.fromJSON({
          // test package.json
          [path.join(root, PACKAGE_JSON)]: JSON.stringify({
            name: 'test-workspace',
            version: '1.0.0',
          }),

          // we need this when we read the package.json of midnight-smoker.
          [midnightSmokerPkgJsonPath]: JSON.stringify({
            name: 'midnight-smoker',
            version: '1.0.0',
          }),
        });
        input = {
          defaultExecutor: nullExecutor,
          fileManager,
          pluginRegistry,
          shouldShutdown: true,
          smokerOptions,
          systemExecutor: nullExecutor,
        };

        runner = createActorRunner(SmokeMachine, {
          logger: Debug('midnight-smoker:actor:SmokeMachine'),
          id: 'SmokeMachine',
        });
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('general behavior', function () {
        describe('when no operations requested', function () {
          it('should short-circuit and resolve with the "noop" flag', async function () {
            await expect(
              runner.runUntilDone({
                ...input,
                smokerOptions: {...input.smokerOptions, lint: false},
              }),
              'to be fulfilled with value satisfying',
              {
                type: OK,
                noop: true,
              },
            );
          });
        });

        describe('default behavior', function () {
          it('should lint and return output with the LintResults', async function () {
            await expect(
              runner.runUntilDone(input),
              'to be fulfilled with value satisfying',
              {
                type: OK,
                lint: [
                  {
                    pkgName: 'test-workspace',
                    type: 'OK',
                  },
                ],
                id: 'SmokeMachine',
              },
            );
          });
        });
      });

      describe('state', function () {
        describe('when the ABORT event is received', function () {
          it('should shutdown and output with the aborted flag', async function () {
            const actor = runner.start(input);
            actor.send({type: 'ABORT', reason: 'butts'});
            await expect(
              runner.runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                aborted: true,
              },
            );
          });
        });

        describe('when a ReporterMachine exits', function () {
          describe('when it exits with an ERROR output', function () {
            it('should abort', async function () {
              const runner = createActorRunner(
                SmokeMachine.provide({
                  actors: {
                    ReporterMachine: ReporterMachine.provide({
                      actors: {
                        setupReporter: fromPromise(
                          sandbox.stub().rejects(new Error('butts')),
                        ),
                      },
                    }),
                  },
                }),
              );
              await expect(
                runner.runUntilDone(input),
                'to be fulfilled with value satisfying',
                {
                  type: ERROR,
                  aborted: true,
                  error: {
                    errors: [
                      {
                        code: ErrorCodes.LifecycleError,
                        cause: {
                          message: 'butts',
                        },
                      },
                    ],
                  },
                },
              );
            });
          });
        });

        describe('when a PkgManagerMachine exits', function () {
          describe('when it exits with an ERROR output', function () {
            it('should abort', async function () {
              const runner = createActorRunner(
                SmokeMachine.provide({
                  actors: {
                    PkgManagerMachine: PkgManagerMachine.provide({
                      actors: {
                        setupPkgManager: fromPromise(
                          sandbox.stub().rejects(new Error('butts')),
                        ),
                      },
                    }),
                  },
                }),
                {
                  logger: Debug('midnight-smoker:actor:SmokeMachine'),
                  id: 'SmokeMachine',
                },
              );
              await expect(
                runner.runUntilDone(input),
                'to be fulfilled with value satisfying',
                {
                  type: ERROR,
                  aborted: true,
                  error: {
                    errors: [
                      {
                        code: ErrorCodes.LifecycleError,
                        cause: {
                          message: 'butts',
                        },
                      },
                    ],
                  },
                },
              );
            });
          });
        });

        describe('.init', function () {
          describe('.initComponents', function () {
            describe('when the context has an error when the child states have completed', function () {
              it('should not transition to .validatePkgManagers', async function () {
                const runner = createActorRunner(
                  SmokeMachine.provide({
                    actors: {
                      queryWorkspaces: fromPromise(() => {
                        throw new Error('butts');
                      }),
                    },
                  }),
                );

                await expect(
                  runner.runUntilTransition(
                    'SmokeMachine.init.initComponents',
                    'SmokeMachine.init.validatingPkgManagers',
                    input,
                  ),
                  'to be rejected',
                );
              });
            });

            describe('.queryingWorkspaces', function () {
              it('should query workspaces and finish', async function () {
                await expect(
                  runner.runUntilTransition(
                    'SmokeMachine.init.initComponents.queryingWorkspaces.queryWorkspaces',
                    'SmokeMachine.init.initComponents.queryingWorkspaces.done',
                    input,
                  ),
                  'to be fulfilled',
                );
              });

              describe('when the queryWorkspaces actor fails', function () {
                let runner: StateMachineRunner<typeof SmokeMachine>;
                let machine: typeof SmokeMachine;
                beforeEach(function () {
                  machine = SmokeMachine.provide({
                    actors: {
                      queryWorkspaces: fromPromise(() => {
                        throw new Error('butts');
                      }),
                    },
                  });
                  runner = createActorRunner(machine);
                });

                it('should transition to its error state', async function () {
                  await expect(
                    runner.runUntilTransition(
                      'SmokeMachine.init.initComponents.queryingWorkspaces.queryWorkspaces',
                      'SmokeMachine.init.initComponents.queryingWorkspaces.errored',
                      input,
                    ),
                    'to be fulfilled',
                  );
                });

                it('should shutdown and output with the aborted flag', async function () {
                  await expect(
                    runner.runUntilDone(input),
                    'to be fulfilled with value satisfying',
                    {
                      aborted: true,
                    },
                  );
                });

                it('should emit Aborted', async function () {
                  await expect(
                    runner.runUntilEvent(
                      [Events.Aborted, Events.SmokeError],
                      input,
                    ),
                    'to be fulfilled',
                  );
                });
              });

              describe('when all workspaces are private', function () {
                beforeEach(function () {
                  vol.fromJSON({
                    '/some-dir/package.json': JSON.stringify({
                      name: 'test-workspace',
                      private: true,
                    }),
                  });
                });

                it('should abort', async function () {
                  await expect(
                    runner.runUntilDone(input),
                    'to be fulfilled with value satisfying',
                    {
                      type: ERROR,
                      error: {
                        errors: [
                          {
                            code: ErrorCodes.PrivateWorkspaceError,
                          },
                        ],
                      },
                      aborted: true,
                    },
                  );
                });

                describe('when private workspaces are allowed', function () {
                  beforeEach(function () {
                    smokerOptions.allowPrivate = true;
                  });

                  it('should exit with OK', async function () {
                    await expect(
                      runner.runUntilDone(input),
                      'to be fulfilled with value satisfying',
                      {
                        type: OK,
                      },
                    );
                  });
                });
              });
            });

            describe('.readSmokerPkgJson', function () {
              it('should read the package.json and finish', async function () {
                await expect(
                  runner.runUntilTransition(
                    'SmokeMachine.init.initComponents.readSmokerPkgJson.reading',
                    'SmokeMachine.init.initComponents.readSmokerPkgJson.done',
                    input,
                  ),
                  'to be fulfilled',
                );
              });

              describe('when the readSmokerPkgJson action fails', function () {
                let err: Error;
                beforeEach(function () {
                  err = new Error('no package.json here dogg');
                  sandbox.stub(fileManager, 'readSmokerPkgJson').rejects(err);
                });

                it('should abort', async function () {
                  await expect(
                    runner.runUntilDone(input),
                    'to be fulfilled with value satisfying',
                    {
                      type: ERROR,
                      error: {
                        errors: [err],
                      },
                      aborted: true,
                    },
                  );
                });
              });
            });

            describe('.loadingPlugins', function () {
              it('should load plugins and finish', async function () {
                await expect(
                  runner.runUntilTransition(
                    'SmokeMachine.init.initComponents.loadingPlugins.loading',
                    'SmokeMachine.init.initComponents.loadingPlugins.done',
                    input,
                  ),
                  'to be fulfilled',
                );
              });

              it('should spawn a PluginLoaderMachine', async function () {
                await expect(
                  runner.runUntilActor(/^PluginLoaderMachine/, input),
                  'to be fulfilled',
                );
              });

              describe('when the PluginLoaderMachine outputs the ERROR type', function () {
                it('should abort', async function () {
                  const err = new Error('yuk');
                  const {runUntilDone} = createActorRunner(
                    SmokeMachine.provide({
                      actors: {
                        PluginLoaderMachine: PluginLoaderMachine.provide({
                          actors: {
                            loadPkgManagers: fromPromise(() => {
                              throw err;
                            }),
                          },
                        }),
                      },
                    }),
                  );

                  await expect(
                    runUntilDone(input),
                    'to be fulfilled with value satisfying',
                    {
                      type: ERROR,
                      error: {
                        errors: [err],
                      },
                      aborted: true,
                    },
                  );
                });
              });

              describe('when multiple plugins should be loaded', function () {
                beforeEach(async function () {
                  await pluginRegistry.registerPlugin('test-plugin2', {
                    plugin(api) {
                      api.definePackageManager({
                        ...nullPkgManagerDef,
                        name: 'moo',
                      });
                    },
                  });
                });
                it('should spawn a PluginLoaderMachine for each plugin', async function () {
                  const actor = runner.start(input);
                  try {
                    await expect(
                      Promise.all([
                        runner.waitForActor(/^PluginLoaderMachine/, actor),
                        runner.waitForActor(/^PluginLoaderMachine/, actor),
                      ]),
                      'to be fulfilled with value satisfying',
                      expect.it('to have length', 2),
                    );
                  } finally {
                    actor.stop();
                  }
                });
              });
            });
          });

          describe('.validatingPkgManagers', function () {
            describe('when all desired pkg managers are fulfilled', function () {
              it('should transition to .spawningEventBusMachines', async function () {
                await expect(
                  runner.runUntilTransition(
                    'SmokeMachine.init.validatingPkgManagers',
                    'SmokeMachine.init.spawningEventBusMachines',
                    input,
                  ),
                  'to be fulfilled',
                );
              });
            });

            describe('when a desired pkg manager is not fulfilled', function () {
              it('should not transition to .spawningEventBusMachines', async function () {
                await expect(
                  runner.runUntilTransition(
                    'SmokeMachine.init.validatingPkgManagers',
                    'SmokeMachine.init.spawningEventBusMachines',
                    {
                      ...input,
                      smokerOptions: {
                        ...input.smokerOptions,
                        pkgManager: [
                          ...input.smokerOptions.pkgManager,
                          'not-a-real-pkg-manager',
                        ],
                      },
                    },
                  ),
                  'to be rejected',
                );
              });

              it('should abort', async function () {
                await expect(
                  runner.runUntilDone({
                    ...input,
                    smokerOptions: {
                      ...input.smokerOptions,
                      pkgManager: [
                        ...input.smokerOptions.pkgManager,
                        'not-a-real-pkg-manager',
                      ],
                    },
                  }),
                  'to be fulfilled with value satisfying',
                  {
                    type: ERROR,
                    aborted: true,
                    error: {
                      errors: [
                        {
                          code: ErrorCodes.UnsupportedPackageManagerError,
                        },
                      ],
                    },
                  },
                );
              });
            });
          });

          describe('.spawningEventBusMachines', function () {
            describe('when no scripts provided', function () {
              it('should not spawn a ScriptBusMachine', async function () {
                await expect(
                  runner.waitForActor('ScriptBusMachine', input),
                  'to be rejected',
                );
              });
            });

            describe('when scripts provided', function () {
              it('should spawn a ScriptBusMachine', async function () {
                await expect(
                  runner.waitForActor('ScriptBusMachine', {
                    ...input,
                    smokerOptions: {
                      ...input.smokerOptions,
                      script: ['foo'],
                    },
                  }),
                  'to be fulfilled',
                );
              });
            });

            describe('when linting requested', function () {
              it('should spawn a LintBusMachine', async function () {
                await expect(
                  runner.waitForActor('LintBusMachine', input),
                  'to be fulfilled',
                );
              });
            });

            it('should spawn a PackBusMachine', async function () {
              await expect(
                runner.waitForActor('PackBusMachine', input),
                'to be fulfilled',
              );
            });

            it('should spawn an InstallBusMachine', async function () {
              await expect(
                runner.waitForActor('InstallBusMachine', input),
                'to be fulfilled',
              );
            });

            describe('when an error occurs', function () {
              it('should not transition to .spawningComponents', async function () {
                const runner = createActorRunner(
                  SmokeMachine.provide({
                    actions: {
                      spawnEventBusMachines: sandbox
                        .stub()
                        .throws(new Error('Nein.')),
                    },
                  }),
                );
                await expect(
                  runner.runUntilTransition(
                    'SmokeMachine.init.spawningEventBusMachines',
                    'SmokeMachine.init.spawningComponents',
                    input,
                  ),
                  'to be rejected',
                );
              });
            });
          });

          describe('.spawningComponents', function () {
            it('should spawn ReporterMachine(s) and PkgManagerMachine(s), then complete', async function () {
              const actor = runner.start(input);
              const p = Promise.all([
                runner.waitForActor(/^ReporterMachine/, actor),
                runner.waitForActor(/^PkgManagerMachine/, actor),
                // this final one stops the machine
                runner.runUntilTransition(
                  'SmokeMachine.init.spawningComponents',
                  'SmokeMachine.init.done',
                  actor,
                ),
              ]);
              // first we need to wait until we hit spawningComponents. since
              // the spawnComponentMachines action is sync, we need to queue up
              // the other promises _before_ this, because otherwise they will
              // have happened already
              await runner.waitForTransition(
                'SmokeMachine.init.spawningEventBusMachines',
                'SmokeMachine.init.spawningComponents',
                actor,
              );
              await expect(p, 'to be fulfilled');
            });

            describe('when it succeeds', function () {
              it('should transition from .init to .working', async function () {
                const actor = runner.start(input);
                await expect(
                  Promise.all([
                    runner.waitForTransition(
                      'SmokeMachine.init.spawningComponents',
                      'SmokeMachine.init.done',
                      actor,
                    ),
                    runner.waitForTransition(
                      'SmokeMachine.init',
                      'SmokeMachine.working',
                      actor,
                    ),
                  ]).finally(() => actor.stop()),
                  'to be fulfilled',
                );
              });

              it('should clear the init payloads from the context', async function () {
                const actor = runner.start(input);
                const snapshot = await runner.runUntilSnapshot(
                  (snapshot) => snapshot.matches('working'),
                  actor,
                );
                expect(
                  {
                    ...snapshot.context.pkgManagerInitPayloads,
                    ...snapshot.context.ruleInitPayloads,
                    ...snapshot.context.reporterInitPayloads,
                  },
                  'to be empty',
                );
              });
            });
          });
        });

        describe('.working', function () {
          describe('when entering', function () {
            it('should have cleared the init payloads from the context', async function () {
              const snapshot = await runner.runUntilSnapshot(
                (snapshot) => snapshot.matches('working'),
                input,
              );
              expect(
                {
                  ...snapshot.context.pkgManagerInitPayloads,
                  ...snapshot.context.ruleInitPayloads,
                  ...snapshot.context.reporterInitPayloads,
                },
                'to be empty',
              );
            });

            it('should emit SmokeBegin', async function () {
              const actor = runner.start(input);

              // TODO: really need some sort of pipeline. this event is synchronously
              // emitted after we reach the snapshot.
              const p = runner.runUntilEvent([Events.SmokeBegin], actor);
              await runner.waitForSnapshot(
                (snapshot) => snapshot.matches('working'),
                actor,
              );
              await expect(p, 'to be fulfilled');
            });

            it('should spawn LISTEN to the PackBusMachine', async function () {
              const actor = runner.start(input);
              await expect(
                runner.waitForEvent(['LISTEN'], actor, {
                  target: 'PackBusMachine',
                }),
                'to be fulfilled',
              );
            });
          });
        });
      });
    });
  });
});
