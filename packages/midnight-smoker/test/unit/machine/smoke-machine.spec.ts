import {
  ERROR,
  Events,
  FAILED,
  InstallEvents,
  OK,
  PACKAGE_JSON,
} from '#constants';
import {type InstallManifest} from '#defs/pkg-manager';
import {ErrorCode} from '#error/codes';
import {InstallError} from '#error/install-error';
import {PackError} from '#error/pack-error';
import {RuleError, type RuleErrorContext} from '#error/rule-error';
import {
  type LintLogicInput,
  type LintLogicOutput,
} from '#machine/actor/operation/lint-logic';
import {ComponentLoaderMachine} from '#machine/component-loader-machine';
import {INIT_ACTION} from '#machine/index';
import {PkgManagerLoaderMachine} from '#machine/pkg-manager-loader-machine';
import {PkgManagerMachine} from '#machine/pkg-manager-machine';
import {ReporterMachine} from '#machine/reporter-machine';
import {RuleMachine} from '#machine/rule-machine';
import {SmokeMachine, type SmokeMachineInput} from '#machine/smoke-machine';
import {OptionsParser} from '#options/options-parser';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {PluginRegistry} from '#plugin/registry';
import {type SmokerOptions} from '#schema/smoker-options';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {FileManager} from '#util/filemanager';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {beforeEach} from 'mocha';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, fromPromise} from 'xstate';
import {
  createActorFromLogic,
  createActorWith,
  type CurryCreateActorFromLogicP1,
  type CurryCreateActorWithP1,
  runUntilDone,
  runUntilEmitted,
  runUntilEventSentWith,
  runUntilSnapshot,
  runUntilSpawn,
  runUntilTransition,
  waitForEventSent,
  waitForEventSentWith,
  waitForSnapshot,
  waitForSpawn,
  waitForTransition,
} from 'xstate-audition';

import {createDebug} from '../../debug';
import {
  nullExecutor,
  nullPkgManager,
  nullPkgManagerSpec,
  nullReporter,
  nullRule,
} from '../mocks/component';

const logger = createDebug(__filename);
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
      let pkgManagerDef: typeof nullPkgManager;
      let actor: Actor<typeof SmokeMachine>;
      const id = 'SmokeMachine';
      let createSmokeActor: CurryCreateActorFromLogicP1<typeof SmokeMachine>;
      let createFrom: CurryCreateActorWithP1<typeof SmokeMachine>;

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        sandbox = createSandbox();
        pluginRegistry = PluginRegistry.create({
          fileManager,
        });
        pkgManagerDef = {...nullPkgManager};
        await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.definePackageManager(pkgManagerDef);
            api.defineRule(nullRule);
            api.defineReporter(nullReporter);
          },
        });
        smokerOptions = OptionsParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          cwd: '/',
          pkgManager: 'nullpm@1.0.0',
          reporter: 'test-plugin/test-reporter',
        });

        // XXX: does memfs care about windows?
        const root = path.resolve('/');
        const midnightSmokerPath = path.resolve(__dirname, '..', '..', '..');
        const midnightSmokerPkgJsonPath = path.join(
          midnightSmokerPath,
          PACKAGE_JSON,
        );

        vol.fromJSON({
          // we need this when we read the package.json of midnight-smoker.
          [midnightSmokerPkgJsonPath]: JSON.stringify({
            name: 'midnight-smoker',
            version: '1.0.0',
          }),

          // test package.json
          [path.join(root, PACKAGE_JSON)]: JSON.stringify({
            dependencies: {
              bambalam: '^3.0.0',
            },
            name: 'root-workspace',
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
        createSmokeActor = createActorFromLogic(SmokeMachine);
        createFrom = createActorWith({id, input, logger});
      });

      afterEach(function () {
        sandbox.restore();
        actor?.stop();
        fileManager.clear();
      });

      describe('general behavior', function () {
        describe('when no operations requested', function () {
          beforeEach(function () {
            // script should already be empty, but just in case
            input = {
              ...input,
              smokerOptions: {...smokerOptions, lint: false, script: []},
            };

            actor = createSmokeActor({id, input, logger});
          });

          it('should short-circuit and resolve with the "noop" flag', async function () {
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

        describe('default behavior', function () {
          beforeEach(function () {
            actor = createSmokeActor({id, input, logger});
          });

          it('should lint the root workspace and return output with the LintResults', async function () {
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                actorId: 'SmokeMachine',
                lint: [
                  {
                    pkgName: 'root-workspace',
                    type: OK,
                  },
                ],
                type: OK,
              },
            );
          });
        });
      });

      describe('state', function () {
        describe('when the ABORT event is received', function () {
          it('should shutdown and output with the aborted flag', async function () {
            actor = createSmokeActor({id, input, logger});
            const promise = runUntilDone(actor);
            actor.send({reason: 'butts', type: 'ABORT'});
            await expect(promise, 'to be fulfilled with value satisfying', {
              aborted: true,
            });
          });
        });

        describe('when a ReporterMachine exits', function () {
          describe('when it exits with an ERROR output', function () {
            it('should abort', async function () {
              const actor = createFrom(
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
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  aborted: true,
                  error: {
                    errors: [
                      {
                        cause: {
                          message: 'butts',
                        },
                        code: ErrorCode.LifecycleError,
                      },
                    ],
                  },
                  type: ERROR,
                },
              );
            });
          });
        });

        describe('when a PkgManagerMachine exits', function () {
          describe('when it exits with an ERROR output', function () {
            it('should abort', async function () {
              const actor = createFrom(
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
              );

              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  aborted: true,
                  error: {
                    errors: [
                      {
                        cause: {
                          message: 'butts',
                        },
                        code: ErrorCode.LifecycleError,
                      },
                    ],
                  },
                  type: ERROR,
                },
              );
            });
          });
        });

        describe('.init', function () {
          beforeEach(function () {
            actor = createSmokeActor({id, input, logger});
          });

          describe('.initComponents', function () {
            describe('when the context has an error when the child states have completed', function () {
              it('should not transition to .validatingPkgManagers', async function () {
                const actor = createFrom(
                  SmokeMachine.provide({
                    actors: {
                      queryWorkspaces: fromPromise(() => {
                        throw new Error('butts');
                      }),
                    },
                  }),
                );

                await expect(
                  runUntilTransition(
                    actor,
                    'SmokeMachine.init.initializing',
                    'SmokeMachine.init.validatingPkgManagers',
                  ),
                  'to be rejected',
                );
              });
            });

            describe('.queryingWorkspaces', function () {
              it('should query workspaces and finish', async function () {
                actor = createSmokeActor({id, input, logger});
                await expect(
                  runUntilTransition(
                    actor,
                    'SmokeMachine.init.initializing.queryingWorkspaces.queryWorkspaces',
                    'SmokeMachine.init.initializing.queryingWorkspaces.done',
                  ),
                  'to be fulfilled',
                );
              });

              describe('when the queryWorkspaces actor fails', function () {
                beforeEach(function () {
                  actor = createFrom(
                    SmokeMachine.provide({
                      actors: {
                        queryWorkspaces: fromPromise(() => {
                          throw new Error('butts');
                        }),
                      },
                    }),
                  );
                });

                it('should transition to its error state', async function () {
                  await expect(
                    runUntilTransition(
                      actor,
                      'SmokeMachine.init.initializing.queryingWorkspaces.queryWorkspaces',
                      'SmokeMachine.init.initializing.queryingWorkspaces.errored',
                    ),
                    'to be fulfilled',
                  );
                });

                it('should shutdown and output with the aborted flag', async function () {
                  await expect(
                    runUntilDone(actor),
                    'to be fulfilled with value satisfying',
                    {
                      aborted: true,
                    },
                  );
                });

                it('should emit Aborted', async function () {
                  await expect(
                    runUntilEmitted(actor, [Events.Aborted, Events.SmokeError]),
                    'to be fulfilled',
                  );
                });
              });

              describe('when all workspaces are private', function () {
                beforeEach(function () {
                  vol.fromJSON({
                    '/package.json': JSON.stringify({
                      name: 'root-workspace',
                      version: '1.0.0',
                      workspaces: ['some-dir'],
                    }),
                    '/some-dir/package.json': JSON.stringify({
                      name: 'test-workspace',
                      private: true,
                      version: '1.0.0',
                    }),
                  });

                  input = {
                    ...input,
                    smokerOptions: {
                      ...input.smokerOptions,
                      workspace: ['test-workspace'],
                    },
                  };
                  actor = createSmokeActor({
                    id,
                    input,
                    logger,
                  });
                });

                it('should abort', async function () {
                  await expect(
                    runUntilDone(actor),
                    'to be fulfilled with value satisfying',
                    {
                      aborted: true,
                      error: {
                        errors: [
                          {
                            code: ErrorCode.PrivateWorkspaceError,
                          },
                        ],
                      },
                      type: ERROR,
                    },
                  );
                });

                describe('when private workspaces are allowed', function () {
                  beforeEach(function () {
                    input = {
                      ...input,
                      smokerOptions: {...smokerOptions, allowPrivate: true},
                    };
                    actor = createSmokeActor({id, input, logger});
                  });

                  it('should exit with OK', async function () {
                    await expect(
                      runUntilDone(actor),
                      'to be fulfilled with value satisfying',
                      {
                        type: OK,
                      },
                    );
                  });
                });
              });

              describe('when additional deps requested', function () {
                beforeEach(function () {
                  input = {
                    ...input,
                    smokerOptions: {...smokerOptions, add: ['bambalam']},
                  };

                  actor = createSmokeActor({id, input, logger});
                });

                it('should reference the workspace package.json to narrow the version of the additional deps', async function () {
                  const snapshot = await runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({
                      init: {initializing: {queryingWorkspaces: 'done'}},
                    }),
                  );
                  expect(snapshot.context.narrowedAdditionalDeps, 'to equal', [
                    'bambalam@^3.0.0',
                  ]);
                });
              });
            });

            describe('.readSmokerPkgJson', function () {
              it('should read the package.json and finish', async function () {
                await expect(
                  runUntilTransition(
                    actor,
                    'SmokeMachine.init.initializing.readSmokerPkgJson.reading',
                    'SmokeMachine.init.initializing.readSmokerPkgJson.done',
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
                    runUntilDone(actor),
                    'to be fulfilled with value satisfying',
                    {
                      aborted: true,
                      error: {
                        errors: [err],
                      },
                      type: ERROR,
                    },
                  );
                });
              });
            });

            describe('.loadingComponents', function () {
              it('should load plugins and finish', async function () {
                await expect(
                  runUntilTransition(
                    actor,
                    'SmokeMachine.init.initializing.loadingComponents.loading',
                    'SmokeMachine.init.initializing.loadingComponents.done',
                  ),
                  'to be fulfilled',
                );
              });

              it('should spawn a ComponentLoaderMachine', async function () {
                await expect(
                  runUntilSpawn(actor, /^ComponentLoaderMachine/),
                  'to be fulfilled',
                );
              });

              describe('when the ComponentLoaderMachine outputs the ERROR type', function () {
                it('should abort', async function () {
                  const err = new Error('yuk');
                  actor = createFrom(
                    SmokeMachine.provide({
                      actors: {
                        ComponentLoaderMachine: ComponentLoaderMachine.provide({
                          actors: {
                            PkgManagerLoaderMachine:
                              PkgManagerLoaderMachine.provide({
                                actions: {
                                  [INIT_ACTION]: () => {
                                    throw err;
                                  },
                                },
                              }),
                          },
                        }),
                      },
                    }),
                  );

                  await expect(
                    runUntilDone(actor),
                    'to be fulfilled with value satisfying',
                    {
                      aborted: true,
                      error: {
                        errors: [err],
                      },
                      type: ERROR,
                    },
                  );
                });
              });

              describe('when multiple plugins should be loaded', function () {
                beforeEach(async function () {
                  await pluginRegistry.registerPlugin('test-plugin2', {
                    plugin(api) {
                      api.definePackageManager({
                        ...nullPkgManager,
                        name: 'moo',
                      });
                    },
                  });
                });

                it('should spawn a ComponentLoaderMachine', async function () {
                  await expect(
                    runUntilSpawn(actor, /^ComponentLoaderMachine/),
                    'to be fulfilled',
                  );
                });
              });
            });
          });

          describe('.validatingPkgManagers', function () {
            describe('when all desired pkg managers are fulfilled', function () {
              it('should transition to .spawningEventBusMachines', async function () {
                await expect(
                  runUntilTransition(
                    actor,
                    'SmokeMachine.init.validatingPkgManagers',
                    'SmokeMachine.init.spawningEventBusMachines',
                  ),
                  'to be fulfilled',
                );
              });
            });

            describe('when a desired pkg manager is not fulfilled', function () {
              beforeEach(function () {
                input = {
                  ...input,
                  smokerOptions: {
                    ...smokerOptions,
                    pkgManager: ['not-a-real-pkg-manager'],
                  },
                };

                actor = createSmokeActor({id, input, logger});
              });

              it('should transition to .spawningEventBusMachines anyway', async function () {
                await expect(
                  runUntilTransition(
                    actor,
                    'SmokeMachine.init.validatingPkgManagers',
                    'SmokeMachine.init.spawningEventBusMachines',
                  ),
                  'to be fulfilled',
                );
              });

              it('should abort', async function () {
                await expect(
                  runUntilDone(actor),
                  'to be fulfilled with value satisfying',
                  {
                    aborted: true,
                    error: {
                      errors: [
                        {
                          code: ErrorCode.UnsupportedPackageManagerError,
                        },
                      ],
                    },
                    type: ERROR,
                  },
                );
              });
            });
          });

          describe('.spawningEventBusMachines', function () {
            describe('when no scripts provided', function () {
              it('should not spawn a ScriptBusMachine', async function () {
                await expect(
                  runUntilSpawn(actor, 'ScriptBusMachine'),
                  'to be rejected',
                );
              });
            });

            describe('when scripts provided', function () {
              beforeEach(function () {
                input = {
                  ...input,
                  smokerOptions: {...smokerOptions, script: ['foo']},
                };

                actor = createSmokeActor({id, input, logger});
              });

              it('should spawn a ScriptBusMachine', async function () {
                await expect(
                  runUntilSpawn(actor, 'ScriptBusMachine'),
                  'to be fulfilled',
                );
              });
            });

            describe('when linting requested', function () {
              it('should spawn a LintBusMachine', async function () {
                await expect(
                  runUntilSpawn(actor, 'LintBusMachine'),
                  'to be fulfilled',
                );
              });
            });

            it('should spawn a PackBusMachine', async function () {
              await expect(
                runUntilSpawn(actor, 'PackBusMachine'),
                'to be fulfilled',
              );
            });

            it('should spawn an InstallBusMachine', async function () {
              await expect(
                runUntilSpawn(actor, 'InstallBusMachine'),
                'to be fulfilled',
              );
            });

            describe('when an error occurs', function () {
              it('should not transition to .spawningComponents', async function () {
                const actor = createFrom(
                  SmokeMachine.provide({
                    actions: {
                      spawnEventBusMachines: sandbox
                        .stub()
                        .throws(new Error('Nein.')),
                    },
                  }),
                );
                const promise = runUntilTransition(
                  actor,
                  'SmokeMachine.init.spawningEventBusMachines',
                  'SmokeMachine.init.spawningComponents',
                );
                await expect(promise, 'to be rejected');
              });
            });
          });

          describe('.spawningComponents', function () {
            it('should spawn ReporterMachine(s) and PkgManagerMachine(s), then complete', async function () {
              const p = Promise.all([
                waitForSpawn(actor, /^ReporterMachine/),
                waitForSpawn(actor, /^PkgManagerMachine/),
                // this final one stops the machine
                runUntilTransition(
                  actor,
                  'SmokeMachine.init.spawningComponents',
                  'SmokeMachine.init.done',
                ),
              ]);
              // first we need to wait until we hit spawningComponents. since
              // the spawnComponentMachines action is sync, we need to queue up
              // the other promises _before_ this, because otherwise they will
              // have happened already
              await waitForTransition(
                actor,
                'SmokeMachine.init.spawningEventBusMachines',
                'SmokeMachine.init.spawningComponents',
              );
              await expect(p, 'to be fulfilled');
            });

            it('should init the bus machines', async function () {
              const EVENTS = ['LISTEN'] as const;

              try {
                await expect(
                  // TODO: devise a better way to express this
                  Promise.all([
                    waitForEventSentWith(
                      actor,
                      {
                        otherActorId: 'PackBusMachine',
                      },
                      EVENTS,
                    ),
                    waitForEventSentWith(
                      actor,
                      {
                        otherActorId: 'InstallBusMachine',
                      },
                      EVENTS,
                    ),
                    waitForEventSentWith(
                      actor,
                      {
                        otherActorId: 'LintBusMachine',
                      },
                      EVENTS,
                    ),
                  ]),
                  'to be fulfilled',
                );
              } finally {
                actor.stop();
              }
            });

            describe('when it succeeds', function () {
              it('should transition from .init to .working', async function () {
                await expect(
                  Promise.all([
                    waitForTransition(
                      actor,
                      'SmokeMachine.init.spawningComponents',
                      'SmokeMachine.init.done',
                    ),
                    waitForTransition(
                      actor,
                      'SmokeMachine.init',
                      'SmokeMachine.working',
                    ),
                  ]).finally(() => actor.stop()),
                  'to be fulfilled',
                );
              });

              it('should clear the init payloads from the context', async function () {
                const {context} = await runUntilSnapshot(actor, (snapshot) =>
                  snapshot.matches('working'),
                );
                expect(
                  {
                    ...context.pkgManagerEnvelopes,
                    ...context.ruleEnvelopes,
                    ...context.reporterEnvelopes,
                  },
                  'to be empty',
                );
              });

              it('should not (yet) spawn any bus machines', async function () {
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches('init'),
                  ),
                  'to be fulfilled with value satisfying',
                  {
                    context: {
                      installBusMachineRef: undefined,
                      lintBusMachineRef: undefined,
                      packBusMachineRef: undefined,
                      scriptBusMachineRef: undefined,
                    },
                  },
                );
              });
            });
          });
        });

        describe('.working', function () {
          beforeEach(function () {
            actor = createSmokeActor({id, input, logger});
          });

          describe('enter', function () {
            it('should have cleared the init payloads from the context', async function () {
              const {context} = await runUntilSnapshot(actor, (snapshot) =>
                snapshot.matches('working'),
              );
              expect(
                {
                  ...context.pkgManagerEnvelopes,
                  ...context.ruleEnvelopes,
                  ...context.reporterEnvelopes,
                },
                'to be empty',
              );
            });

            it('should emit SmokeBegin', async function () {
              // TODO: really need some sort of pipeline. this event is synchronously
              // emitted after we reach the snapshot.
              const p = runUntilEmitted(actor, [Events.SmokeBegin]);
              await waitForSnapshot(actor, (snapshot) =>
                snapshot.matches('working'),
              );
              await expect(p, 'to be fulfilled');
            });
          });

          describe('.packing', function () {
            describe('.listening', function () {
              it('should send LISTEN to the PackBusMachine', async function () {
                await expect(
                  runUntilEventSentWith(
                    actor,
                    {
                      otherActorId: 'PackBusMachine',
                    },
                    ['LISTEN'],
                  ),
                  'to be fulfilled',
                );
              });

              it('should send BEGIN to each PkgManagerMachine', async function () {
                const p = waitForEventSent(actor, ['BEGIN']);
                // TODO I don't have a way to match _ref against the event yet.
                const _ref = await runUntilSpawn(actor, /^PkgManagerMachine/);

                await expect(p, 'to be fulfilled');
              });

              it('should forward PACK.* events from the PkgManagerMachine to the PackBusMachine', async function () {
                await expect(
                  runUntilEventSentWith(
                    actor,
                    {otherActorId: 'PackBusMachine'},
                    [
                      Events.PkgManagerPackBegin,
                      Events.PkgPackBegin,
                      Events.PkgPackOk,
                      Events.PkgManagerPackOk,
                    ],
                  ),
                  'to be fulfilled',
                );
              });

              describe('when packing fails', function () {
                beforeEach(async function () {
                  actor = createFrom(
                    SmokeMachine.provide({
                      actors: {
                        PkgManagerMachine: PkgManagerMachine.provide({
                          actors: {
                            // this actor _must_ throw a PackError.
                            pack: fromPromise(() => {
                              throw new PackError(
                                'potato pants',
                                PkgManagerSpec.create('nullpm@1.0.0').toJSON(),
                                {} as WorkspaceInfo,
                                '/somewhere',
                              );
                            }),
                          },
                        }),
                      },
                    }),
                  );
                });

                it('should abort', async function () {
                  await expect(
                    runUntilDone(actor),
                    'to be fulfilled with value satisfying',
                    {
                      aborted: true,
                      error: {
                        code: ErrorCode.SmokeError,
                        errors: [
                          {
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

            describe('.done', function () {
              it('should cleanup the pack bus machine', async function () {
                const actor = createSmokeActor({
                  id,
                  input,
                  logger,
                });
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({working: {packing: 'done'}}),
                  ),
                  'to be fulfilled with value satisfying',
                  {
                    context: {
                      packBusMachineRef: expect.it('to be falsy'),
                    },
                  },
                );
              });
            });
          });

          describe('.installing', function () {
            // note that .installing can only be inspected this way
            // because it does not immediately take actions when .working
            // is entered -- unlike .packing.
            beforeEach(async function () {
              actor = createSmokeActor({id, input, logger});
              await waitForSnapshot(actor, (snapshot) =>
                snapshot.matches({working: 'installing'}),
              );
            });

            describe('when installation succeeds', function () {
              it('should transition to .done', async function () {
                await expect(
                  runUntilTransition(
                    actor,
                    'SmokeMachine.working.installing.listening',
                    'SmokeMachine.working.installing.done',
                  ),
                  'to be fulfilled',
                );
              });

              it('should send the corresponding events to the InstallBusMachine', async function () {
                await expect(
                  runUntilEventSentWith(
                    actor,
                    {otherActorId: 'InstallBusMachine'},
                    [
                      InstallEvents.PkgManagerInstallBegin,
                      InstallEvents.PkgInstallBegin,
                      InstallEvents.PkgInstallOk,
                      InstallEvents.PkgManagerInstallOk,
                    ],
                  ),
                  'to be fulfilled',
                );
              });
            });

            describe('when installation fails', function () {
              beforeEach(async function () {
                actor = createFrom(
                  SmokeMachine.provide({
                    actors: {
                      PkgManagerMachine: PkgManagerMachine.provide({
                        actors: {
                          // this actor _must_ throw a PackError.
                          install: fromPromise(() => {
                            throw new InstallError(
                              {
                                all: '',
                                command: '',
                                exitCode: 1,
                                failed: true,
                                stderr: '',
                                stdout: '',
                              },
                              {} as InstallManifest,
                              nullPkgManagerSpec,
                            );
                          }),
                        },
                      }),
                    },
                  }),
                );
              });

              it('should abort', async function () {
                await expect(
                  runUntilDone(actor),
                  'to be fulfilled with value satisfying',
                  {
                    aborted: true,
                    error: {
                      errors: [
                        {
                          code: ErrorCode.InstallError,
                          context: {originalMessage: /whoops/},
                        },
                      ],
                    },
                    type: ERROR,
                  },
                );
              });
            });
          });

          describe('.linting', function () {
            beforeEach(async function () {
              actor = createSmokeActor({id, input, logger});
              await waitForSnapshot(actor, (snapshot) =>
                snapshot.matches({working: 'linting'}),
              );
            });

            describe('when linting succeeds', function () {
              it('should transition to .ok', async function () {
                await expect(
                  runUntilTransition(
                    actor,
                    'SmokeMachine.working.linting.listening',
                    'SmokeMachine.working.linting.ok',
                  ),
                  'to be fulfilled',
                );
              });

              it('should send the corresponding events to the LintBusMachine', async function () {
                await expect(
                  runUntilEventSentWith(
                    actor,
                    {otherActorId: 'LintBusMachine'},
                    [
                      Events.PkgManagerLintBegin,
                      Events.RuleBegin,
                      Events.RuleOk,
                      Events.PkgManagerLintOk,
                    ],
                  ),
                  'to be fulfilled',
                );
              });
            });

            describe('when a rule errors', function () {
              let err: RuleError;

              beforeEach(async function () {
                err = new RuleError(
                  'ugaddh',
                  {} as RuleErrorContext,
                  new Error('whaaa?'),
                );
                actor = createFrom(
                  SmokeMachine.provide({
                    actors: {
                      PkgManagerMachine: PkgManagerMachine.provide({
                        actors: {
                          RuleMachine: RuleMachine.provide({
                            actors: {
                              lint: fromPromise<
                                LintLogicOutput,
                                LintLogicInput
                              >(async () => {
                                // MUST be a RuleError
                                throw err;
                              }),
                            },
                          }),
                        },
                      }),
                    },
                  }),
                );
              });

              it('should abort', async function () {
                await expect(
                  runUntilDone(actor),
                  'to be fulfilled with value satisfying',
                  {
                    aborted: true,
                    error: {
                      errors: [
                        {
                          code: ErrorCode.RuleError,
                          message: err.message,
                        },
                      ],
                    },
                    type: ERROR,
                  },
                );
              });
            });

            describe('when all rules pass', function () {
              it('should exit with OK output', async function () {
                await expect(
                  runUntilDone(actor),
                  'to be fulfilled with value satisfying',
                  {
                    lint: [
                      {
                        pkgName: 'root-workspace',
                        results: [
                          {
                            rule: nullRule,
                            type: OK,
                          },
                        ],
                        type: OK,
                      },
                    ],
                    type: OK,
                  },
                );
              });
            });

            describe('when a rule fails', function () {
              beforeEach(async function () {
                sandbox.stub(nullRule, 'check').callsFake((ctx) => {
                  ctx.addIssue('oh no');
                });
              });

              it('should exit with FAILED output', async function () {
                await expect(
                  runUntilDone(actor),
                  'to be fulfilled with value satisfying',
                  {
                    lintFailed: [
                      {
                        pkgName: 'root-workspace',
                        results: [
                          {
                            isError: true,
                            message: 'oh no',
                            rule: nullRule,
                            type: FAILED,
                          },
                        ],
                        type: FAILED,
                      },
                    ],
                    type: FAILED,
                  },
                );
              });
            });
          });

          describe('.running', function () {
            it('needs tests, badly');
          });
        });
      });
    });
  });
});
