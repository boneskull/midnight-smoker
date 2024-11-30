// TODO: Fix

import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {ERROR, OK, PackEvents} from 'midnight-smoker/constants';
import {type Executor} from 'midnight-smoker/defs/executor';
import {type PkgManager} from 'midnight-smoker/defs/pkg-manager';
import {ErrorCode} from 'midnight-smoker/error';
import {OptionsParser} from 'midnight-smoker/options';
import {type PkgManagerSpec} from 'midnight-smoker/pkg-manager';
import {
  type PkgManagerEnvelope,
  type PluginMetadata,
  PluginRegistry,
} from 'midnight-smoker/plugin';
import {type SmokerOptions, type WorkspaceInfo} from 'midnight-smoker/schema';
import {FileManager, serialize} from 'midnight-smoker/util';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {
  type Actor,
  type ActorLogicFrom,
  type AnyActorRef,
  createActor,
  createEmptyActor,
  fromPromise,
} from 'xstate';
import {
  createActorWith,
  type CurryCreateActorWithP1,
  runUntilDone,
  runUntilEventSent,
  runUntilSnapshot,
  runUntilTransition,
  waitForEventSent,
  waitForSnapshot,
} from 'xstate-audition';

import {
  PkgManagerMachine,
  type PkgManagerMachineInput,
} from '../../src/pkg-manager-machine';
import {createDebug} from '../debug';
import {
  nullExecutor,
  nullPkgManager,
  nullPkgManagerSpec,
  testPlugin,
  testWorkspaces,
} from './fixture';

const expect = unexpected.clone().use(unexpectedSinon);
const logger = createDebug(__filename);

describe('midnight-smoker', () => {
  describe('machine', () => {
    describe('PkgManagerMachine', () => {
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
      let envelope: PkgManagerEnvelope;
      let actor: Actor<typeof PkgManagerMachine>;
      let workspaces: WorkspaceInfo[];
      let input: PkgManagerMachineInput;
      let logic: ActorLogicFrom<typeof PkgManagerMachine>;

      const sender = 'test';
      const id = 'PkgManagerMachine';
      let createActorWithDefaults: CurryCreateActorWithP1<
        typeof PkgManagerMachine
      >;

      beforeEach(async () => {
        logic = PkgManagerMachine;
        ({vol} = memfs());
        workspaces = [...testWorkspaces];
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({
          fileManager,
        });
        sandbox = createSandbox();
        pkgManager = {...nullPkgManager};
        plugin = {...testPlugin};
        executor = nullExecutor.bind(null);
        smokerOptions = OptionsParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          reporter: 'test-plugin/test-reporter',
        });
        parentRef = createEmptyActor();
        setup = sandbox.stub(pkgManager, 'setup').resolves();
        teardown = sandbox.stub(pkgManager, 'teardown').resolves();
        spec = nullPkgManagerSpec.clone();
        envelope = {
          id: 'test-plugin/nullpm',
          pkgManager,
          plugin: serialize(plugin),
          spec,
        };
        input = {
          envelope,
          executor,
          fileManager,
          parentRef,
          smokerOptions,
        };
        createActorWithDefaults = createActorWith({id, input, logger});
        actor = createActorWithDefaults(logic);
      });

      afterEach(() => {
        sandbox.restore();
        actor?.stop();
      });

      describe('lifecycle hooks', () => {
        beforeEach(() => {
          input = {...input, workspaces};
          actor = createActor(logic, {id, input, logger});
        });

        it('should create a PkgManagerContext', async () => {
          let snapshot = await waitForSnapshot(actor, (snapshot) =>
            snapshot.matches({startup: 'createPkgManagerContext'}),
          );
          expect(snapshot.context.ctx, 'to be falsy');
          snapshot = await runUntilSnapshot(actor, (snapshot) =>
            snapshot.matches({startup: 'setupLifecycle'}),
          );
          expect(snapshot.context.ctx, 'to be ok');
        });

        describe('when createPkgManagerContext fails', () => {
          let err: Error;

          beforeEach(() => {
            err = new Error('context creation failed');
            logic = logic.provide({
              actors: {
                createPkgManagerContext: fromPromise<any, any>(async () => {
                  throw err;
                }),
              },
            });
            actor = createActor(logic, {id, input, logger});
          });

          it('should retain the error', async () => {
            await expect(
              runUntilSnapshot(
                actor,
                (snapshot) => snapshot.context.error?.cause?.cause === err,
              ),
              'to be fulfilled',
            );
          });

          it('should skip the "setup" lifecycle hook', async () => {
            await expect(
              runUntilSnapshot(actor, (snapshot) =>
                snapshot.matches({startup: 'setupLifecycle'}),
              ),
              'to be rejected',
            );
          });

          it('should skip the "teardown" lifecycle hook', async () => {
            await expect(
              runUntilSnapshot(actor, (snapshot) =>
                snapshot.matches({shutdown: 'teardownLifecycle'}),
              ),
              'to be rejected',
            );
          });
        });

        it('should call the "setup" lifecycle hook', async () => {
          await runUntilSnapshot(actor, (snapshot) =>
            snapshot.matches({working: 'packing'}),
          );
          expect(pkgManager.setup, 'was called once');
        });

        describe('when the "setup" hook rejects', () => {
          beforeEach(() => {
            setup.rejects(new Error('setup failed'));
          });

          it('should call the "teardown" lifecycle hook', async () => {
            await runUntilDone(actor);
            expect(pkgManager.teardown, 'was called once');
          });

          it('should destroy the PkgManagerContext', async () => {
            await waitForSnapshot(
              actor,
              (snapshot) => !!snapshot.context.error && !!snapshot.context.ctx,
            );

            await expect(
              runUntilSnapshot(actor, (snapshot) => !snapshot.context.ctx),
              'to be fulfilled',
            );
          });

          it('should output with a MachineError and aborted flag', async () => {
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

        describe('when initialized without workspaces', () => {
          beforeEach(() => {
            actor = createActor(logic, {
              id,
              input: {...input, workspaces: []},
              logger,
            });
          });

          it('should not transition from initial state (.idle) to .startup', async () => {
            await expect(
              runUntilTransition(
                actor,
                'PkgManagerMachine.idle',
                'PkgManagerMachine.startup',
              ),
              'to be rejected',
            );
          });

          describe('when "START" received', () => {
            it('should transition from initial state (.idle) to .startup', async () => {
              const promise = runUntilTransition(
                actor,
                'PkgManagerMachine.idle',
                'PkgManagerMachine.startup',
              );
              actor.send({sender, type: 'START', workspaces});
              await expect(promise, 'to be fulfilled');
            });
          });
        });

        describe('when HALT received', () => {
          it('should transition to .shutdown', async () => {
            await waitForSnapshot(actor, (snapshot) =>
              snapshot.matches('working'),
            );
            const promise = runUntilTransition(
              actor,
              'PkgManagerMachine.working',
              'PkgManagerMachine.shutdown',
            );
            actor.send({sender, type: 'HALT'});
            await expect(promise, 'to be fulfilled');
          });

          it('should call the "teardown" lifecycle hook', async () => {
            await waitForSnapshot(actor, (snapshot) =>
              snapshot.matches('working'),
            );
            const promise = runUntilDone(actor);
            actor.send({sender, type: 'HALT'});
            await promise;
            expect(pkgManager.teardown, 'was called once');
          });

          describe('when the "teardown" hook rejects', () => {
            beforeEach(() => {
              teardown.rejects(new Error('teardown failed'));
            });

            it('should output with a MachineError', async () => {
              await waitForSnapshot(actor, (snapshot) =>
                snapshot.matches('working'),
              );
              const promise = runUntilDone(actor);

              actor.send({sender, type: 'HALT'});

              await expect(promise, 'to be fulfilled with value satisfying', {
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
              });
            });
          });
          describe('when destroyPkgManagerContext rejects', () => {
            let err: Error;
            beforeEach(() => {
              err = new Error('prune failed');
              sandbox.stub(fileManager, 'pruneTempDir').rejects(err);
            });

            it('should output with a MachineError > LifecycleError > Error', async () => {
              await waitForSnapshot(actor, (snapshot) =>
                snapshot.matches('working'),
              );
              const promise = runUntilDone(actor);
              actor.send({sender, type: 'HALT'});
              await expect(promise, 'to be fulfilled with value satisfying', {
                error: {
                  code: ErrorCode.MachineError,
                  errors: [
                    {
                      cause: err,
                      code: ErrorCode.LifecycleError,
                      context: {stage: 'teardown'},
                    },
                  ],
                },
                type: ERROR,
              });
            });
          });
        });
      });

      describe('state', () => {
        describe('startup', () => {
          describe('when HALT received', () => {
            it('should exit without error', async () => {
              const promise = runUntilDone(actor);
              actor.send({sender, type: 'HALT'});
              await expect(promise, 'to be fulfilled with value satisfying', {
                type: OK,
              });
            });
          });

          describe('when create');

          it('should skip the "setup" lifecycle hook', async () => {
            await expect(
              runUntilSnapshot(actor, (snapshot) =>
                snapshot.matches({startup: 'setupLifecycle'}),
              ),
              'to be rejected',
            );
          });

          it('should skip the "teardown" lifecycle hook', async () => {
            await expect(
              runUntilSnapshot(actor, (snapshot) =>
                snapshot.matches({shutdown: 'teardownLifecycle'}),
              ),
              'to be rejected',
            );
          });

          it('should exit with an error', async () => {
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

      describe('working', () => {
        describe('installing', () => {
          describe('when additional deps are provided', () => {
            beforeEach(() => {
              smokerOptions = {...smokerOptions, add: ['foo@1.0.0']};
              input = {...input, smokerOptions};
            });

            describe('when workspaces are empty', () => {
              it('should not attempt to install additional deps', async () => {
                actor = createActor(logic, {
                  id,
                  input,
                  logger,
                });
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({
                      working: 'installing',
                    }),
                  ),
                  'to be rejected',
                );
              });
            });

            describe('when workspaceInfo is nonempty', () => {
              beforeEach(() => {
                input = {...input, workspaces};
              });

              it('should install additional deps', async () => {
                actor = createActor(logic, {
                  id,
                  input,
                  logger,
                });
                await expect(
                  runUntilSnapshot(actor, (snapshot) =>
                    snapshot.matches({
                      working: 'installing',
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
        });

        describe('packing', () => {
          beforeEach(() => {
            input = {...input, workspaces};
            actor = createActor(logic, {id, input, logger});
          });

          describe('packingPkgs', () => {
            it('should send expected events in order', async () => {
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

            it('should not send PACK.PKG_MANAGER.BEGIN multiple times', async () => {
              await expect(
                waitForEventSent(actor, [PackEvents.PkgManagerPackBegin]),
                'to be fulfilled',
              );
              await expect(
                runUntilEventSent(actor, [PackEvents.PkgManagerPackBegin]),
                'to be rejected',
              );
            });

            describe('when packing fails', () => {
              beforeEach(() => {
                pkgManager.pack = sandbox
                  .stub()
                  .rejects(new Error('packing BAD'));
                actor = createActor(logic, {
                  id,
                  input,
                  logger,
                });
              });

              it('should send PACK.PKG.FAILED and PACK.PKG_MANAGER.FAILED events', async () => {
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

              it('should output with a MachineError and aborted flag', async () => {
                actor = createActor(logic, {
                  id,
                  input,
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

        describe('installing', () => {
          beforeEach(() => {
            actor = createActor(logic, {id, input, logger});
          });
        });
      });

      describe('shutdown', () => {
        describe('when destroying the PkgManagerContext fails', () => {
          beforeEach(() => {
            sandbox
              .stub(fileManager, 'pruneTempDir')
              .rejects(new Error('prune failed'));
            actor = createActor(logic, {id, input, logger});
          });

          it('should output with a MachineError', async () => {
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

        describe('when the "linger" flag was provided', () => {
          beforeEach(() => {
            input = {
              ...input,
              smokerOptions: {...smokerOptions, linger: true},
            };
            actor = createActor(logic, {id, input, logger});
          });

          it('should send the LINGERED event', async () => {
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
