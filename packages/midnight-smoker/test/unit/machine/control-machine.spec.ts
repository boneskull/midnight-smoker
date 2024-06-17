import {ERROR, OK, PACKAGE_JSON, SmokerEvent} from '#constants';
import {ErrorCodes} from '#error/codes';
import {ControlMachine, type CtrlMachineInput} from '#machine/control-machine';
import {PluginLoaderMachine} from '#machine/plugin-loader-machine';
import {OptionsParser} from '#options/options-parser';
import {PluginRegistry} from '#plugin/plugin-registry';
import {type SmokerOptions} from '#schema/smoker-options';
import {FileManager} from '#util/filemanager';
import Debug from 'debug';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
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
    describe('ControlMachine', function () {
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      let smokerOptions: SmokerOptions;
      let sandbox: sinon.SinonSandbox;
      let input: CtrlMachineInput;
      let runner: StateMachineRunner<typeof ControlMachine>;

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({fileManager});
        sandbox = createSandbox();
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

        runner = createActorRunner(ControlMachine, {
          logger: Debug('midnight-smoker:actor:ControlMachine'),
          id: 'ControlMachine',
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
                id: 'ControlMachine',
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

        describe('.init', function () {
          describe('.initComponents', function () {
            describe('when the context has an error when the child states have completed', function () {
              it('should not transition to .validatePkgManagers', async function () {
                const runner = createActorRunner(
                  ControlMachine.provide({
                    actors: {
                      queryWorkspaces: fromPromise(() => {
                        throw new Error('butts');
                      }),
                    },
                  }),
                );

                await expect(
                  runner.runUntilTransition(
                    'ControlMachine.init.initComponents',
                    'ControlMachine.init.validatePkgManagers',
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
                    'ControlMachine.init.initComponents.queryingWorkspaces.queryWorkspaces',
                    'ControlMachine.init.initComponents.queryingWorkspaces.done',
                    input,
                  ),
                  'to be fulfilled',
                );
              });

              describe('when the queryWorkspaces actor fails', function () {
                let runner: StateMachineRunner<typeof ControlMachine>;
                let machine: typeof ControlMachine;
                beforeEach(function () {
                  machine = ControlMachine.provide({
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
                      'ControlMachine.init.initComponents.queryingWorkspaces.queryWorkspaces',
                      'ControlMachine.init.initComponents.queryingWorkspaces.errored',
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
                      [SmokerEvent.Aborted, SmokerEvent.SmokeError],
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
                    'ControlMachine.init.initComponents.readSmokerPkgJson.reading',
                    'ControlMachine.init.initComponents.readSmokerPkgJson.done',
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
                    'ControlMachine.init.initComponents.loadingPlugins.loading',
                    'ControlMachine.init.initComponents.loadingPlugins.done',
                    input,
                  ),
                  'to be fulfilled',
                );
              });

              describe('when the PluginLoaderMachine outputs the ERROR type', function () {
                it('should abort', async function () {
                  const err = new Error('yuk');
                  const {runUntilDone} = createActorRunner(
                    ControlMachine.provide({
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
            });
          });

          describe('.validatePkgManagers', function () {
            it('needs a test');
          });

          describe('.spawningEventBusMachines', function () {
            it('needs a test');
          });

          describe('.spawningComponents', function () {
            it('needs a test');
          });
        });
      });
    });
  });
});
