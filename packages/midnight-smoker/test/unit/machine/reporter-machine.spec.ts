import {ErrorCodes} from '#error/codes';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import {type PackageJson} from 'type-fest';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createActor, toPromise, type Actor} from 'xstate';
import {ERROR} from '../../../src/constants';
import {
  SmokerEvent,
  type DataForEvent,
  type EventData,
} from '../../../src/event';
import {
  ReporterMachine,
  drainQueue,
  setupReporter,
  teardownReporter,
  type DrainQueueInput,
  type ReporterLifecycleHookInput,
} from '../../../src/machine/reporter';
import {OptionParser, type SmokerOptions} from '../../../src/options';
import {type PluginMetadata} from '../../../src/plugin';
import {PluginRegistry} from '../../../src/plugin/plugin-registry';
import {type ReporterDef} from '../../../src/reporter';
import {FileManager} from '../../../src/util/filemanager';
import {serialize} from '../../../src/util/serialize';
import {nullReporter} from '../mocks/component';
import {createMachineRunner} from './machine-helpers';

const expect = unexpected.clone().use(unexpectedSinon);

const {startMachine, runUntilSnapshot} = createMachineRunner(ReporterMachine);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('ReporterMachine', function () {
      const smokerPkgJson: PackageJson = {
        name: 'midnight-smoker',
        version: '1.0.0',
      };
      let plugin: Readonly<PluginMetadata>;
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      let smokerOptions: SmokerOptions;
      let sandbox: sinon.SinonSandbox;
      let def: ReporterDef;
      let setup: sinon.SinonStub;
      let teardown: sinon.SinonStub;
      let ac: AbortController;
      let signal: AbortSignal;
      let staticPlugin: StaticPluginMetadata;

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({fileManager});
        sandbox = createSandbox();
        def = {...nullReporter};
        plugin = await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.defineReporter(nullReporter);
          },
        });
        staticPlugin = serialize(plugin);
        smokerOptions = OptionParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          reporter: 'test-plugin/test-reporter',
        });
        setup = sandbox.stub(def, 'setup').resolves();
        teardown = sandbox.stub(def, 'teardown').resolves();
        ac = new AbortController();
        ({signal} = ac);
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('lifecycle hooks', function () {
        it('should call the "setup" lifecycle hook', async function () {
          const actor = startMachine({
            def,
            plugin,
            smokerPkgJson,
            smokerOptions,
            signal,
          });
          actor.send({type: 'HALT'});
          await toPromise(actor);
          expect(def.setup, 'was called once');
        });

        it('should call the "teardown" lifecycle hook', async function () {
          const actor = startMachine({
            def,
            plugin,
            smokerPkgJson,
            smokerOptions,
            signal,
          });
          actor.send({type: 'HALT'});
          await toPromise(actor);
          expect(def.teardown, 'was called once');
        });

        describe('when the "setup" lifecycle hook rejects', function () {
          it('should exit with ERROR output', async function () {
            setup.rejects(new Error('test error'));
            const actor = startMachine({
              def,
              plugin,
              smokerPkgJson,
              smokerOptions,
              signal,
            });
            await expect(
              toPromise(actor),
              'to be fulfilled with value satisfying',
              {
                type: ERROR,
                error: {
                  code: ErrorCodes.MachineError,
                  errors: [
                    {
                      code: ErrorCodes.LifecycleError,
                      context: {
                        stage: 'setup',
                        kind: 'reporter',
                      },
                    },
                  ],
                },
              },
            );
          });
        });

        describe('when the "teardown" lifecycle hook rejects', function () {
          it('should exit with ERROR output', async function () {
            teardown.rejects(new Error('test error'));
            const actor = startMachine({
              def,
              plugin,
              smokerPkgJson,
              smokerOptions,
              signal,
            });
            actor.send({type: 'HALT'});
            await expect(
              toPromise(actor),
              'to be fulfilled with value satisfying',
              {
                type: ERROR,
                error: {
                  code: ErrorCodes.MachineError,
                  errors: [
                    {
                      code: ErrorCodes.LifecycleError,
                      context: {
                        stage: 'teardown',
                        kind: 'reporter',
                      },
                    },
                  ],
                },
              },
            );
          });
        });
      });

      describe('event handling', function () {
        let actor: Actor<typeof ReporterMachine>;
        let onBeforeExit: sinon.SinonStub;
        let onNoop: sinon.SinonStub;

        beforeEach(function () {
          def.onBeforeExit = onBeforeExit = sandbox.stub();
          def.onNoop = onNoop = sandbox.stub();
          actor = startMachine({
            def,
            plugin,
            smokerPkgJson,
            smokerOptions,
            signal,
          });
        });

        afterEach(function () {
          actor?.stop();
        });

        describe('event EVENT', function () {
          it('should invoke the appropriate event listener in the reporter def', function () {
            actor.send({
              type: 'EVENT',
              event: {type: SmokerEvent.Noop},
            });
            expect(onNoop, 'was called once');
          });

          describe('when an event listener rejects', function () {
            it('should exit with ERROR output', async function () {
              onBeforeExit.rejects(new Error('test error'));
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.BeforeExit},
              });
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.Noop},
              });
              await expect(
                toPromise(actor),
                'to be fulfilled with value satisfying',
                {
                  type: ERROR,
                  error: {
                    code: ErrorCodes.MachineError,
                    errors: [
                      {
                        code: ErrorCodes.ReporterListenerError,
                      },
                    ],
                  },
                },
              );
            });

            it('should not invoke listeners after one has failed', async function () {
              onBeforeExit.rejects(new Error('test error'));
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.Noop},
              });
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.BeforeExit},
              });
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.Noop},
              });
              await toPromise(actor);

              expect(onNoop, 'was called once');
            });
          });

          describe('when events are received during shutdown', function () {
            it('should ignore the events', async function () {
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.Noop},
              });
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.Noop},
              });
              actor.send({type: 'HALT'});
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.Noop},
              });
              actor.send({
                type: 'EVENT',
                event: {type: SmokerEvent.Noop},
              });
              await toPromise(actor);
              expect(onNoop, 'was called twice');
            });
          });
        });

        describe('event HALT', function () {
          it('should stop the machine after draining the queue', async function () {
            actor.send({
              type: 'EVENT',
              event: {type: SmokerEvent.BeforeExit},
            });
            actor.send({type: 'HALT'});
            await toPromise(actor);
            expect(onBeforeExit, 'was called once');
            expect(actor.getSnapshot().status, 'to be', 'done');
          });
        });
      });

      describe('actors', function () {
        describe('drainQueue', function () {
          describe('when the signal is aborted', function () {
            it('should throw an AbortError', async function () {
              const queue: DataForEvent<keyof EventData>[] = [
                {type: SmokerEvent.BeforeExit},
              ];
              const input: DrainQueueInput = {
                def,
                ctx: {
                  opts: smokerOptions,
                  pkgJson: smokerPkgJson,
                  plugin: staticPlugin,
                },
                queue,
                signal,
              };
              ac.abort();
              await expect(
                createMachineRunner(drainQueue).runMachine(input),
                'to be rejected with error satisfying',
                {code: ErrorCodes.AbortError},
              );
            });
          });

          describe('when a listener throws', function () {
            it('should reject with a ReporterListenerError', async function () {
              const queue: DataForEvent<keyof EventData>[] = [
                {type: SmokerEvent.BeforeExit},
              ];
              def.onBeforeExit = sandbox.stub().throws(new Error('test error'));
              const input: DrainQueueInput = {
                def,
                ctx: {
                  opts: smokerOptions,
                  pkgJson: smokerPkgJson,
                  plugin: staticPlugin,
                },
                queue,
                signal,
              };
              await expect(
                createMachineRunner(drainQueue).runMachine(input),
                'to be rejected with error satisfying',
                {code: ErrorCodes.ReporterListenerError},
              );
            });
          });

          describe('when provided a non-empty queue', function () {
            it('should process the queue', async function () {
              const queue: DataForEvent<keyof EventData>[] = [
                {type: SmokerEvent.BeforeExit},
              ];
              def.onBeforeExit = sandbox.stub();
              const input: DrainQueueInput = {
                def,
                ctx: {
                  opts: smokerOptions,
                  pkgJson: smokerPkgJson,
                  plugin: staticPlugin,
                },
                queue,
                signal,
              };
              await createMachineRunner(drainQueue).runMachine(input);
              expect(def.onBeforeExit, 'was called once');
            });
          });

          describe('when provided an empty queue', function () {
            it('should not process the queue', async function () {
              const queue: DataForEvent<keyof EventData>[] = [];
              sandbox.stub(queue, 'shift');
              const input: DrainQueueInput = {
                def,
                ctx: {
                  opts: smokerOptions,
                  pkgJson: smokerPkgJson,
                  plugin: staticPlugin,
                },
                queue,
                signal,
              };
              await createMachineRunner(drainQueue).runMachine(input);
              expect(queue.shift, 'was not called');
            });
          });
        });

        describe('setupReporter', function () {
          it('should call the setup function of the reporter def', async function () {
            const input: ReporterLifecycleHookInput = {
              def,
              ctx: {
                opts: smokerOptions,
                pkgJson: smokerPkgJson,
                plugin: staticPlugin,
              },
              signal,
            };
            await createMachineRunner(setupReporter).runMachine(input);
            expect(setup, 'was called once');
          });

          describe('when the signal is aborted', function () {
            it('should throw an AbortError', async function () {
              const input: ReporterLifecycleHookInput = {
                def,
                ctx: {
                  opts: smokerOptions,
                  pkgJson: smokerPkgJson,
                  plugin: staticPlugin,
                },
                signal,
              };
              ac.abort();
              await expect(
                createMachineRunner(setupReporter).runMachine(input),
                'to be rejected with error satisfying',
                {code: ErrorCodes.AbortError},
              );
            });
          });
        });

        describe('teardownReporter', function () {
          it('should call the teardown function of the reporter def', async function () {
            const input: ReporterLifecycleHookInput = {
              def,
              ctx: {
                opts: smokerOptions,
                pkgJson: smokerPkgJson,
                plugin: staticPlugin,
              },
              signal,
            };
            await createMachineRunner(teardownReporter).runMachine(input);
            expect(teardown, 'was called once');
          });

          describe('when the signal is aborted', function () {
            it('should throw an AbortError', async function () {
              const input: ReporterLifecycleHookInput = {
                def,
                ctx: {
                  opts: smokerOptions,
                  pkgJson: smokerPkgJson,
                  plugin: staticPlugin,
                },
                signal,
              };
              ac.abort();
              await expect(
                createMachineRunner(teardownReporter).runMachine(input),
                'to be rejected with error satisfying',
                {code: ErrorCodes.AbortError},
              );
            });
          });
        });
      });

      describe('startup', function () {
        describe('when the signal was aborted before starting the machine', function () {
          /**
           * @see {@link https://github.com/statelyai/xstate/issues/4928}
           */
          it('should fail', async function () {
            const ac = new AbortController();
            signal = ac.signal;
            ac.abort(new Error('abort'));
            const actor = createActor(ReporterMachine, {
              input: {
                def,
                plugin,
                smokerPkgJson,
                smokerOptions,
                signal,
              },
            });
            const promise = toPromise(actor);
            actor.start();
            await expect(promise, 'to be rejected with error satisfying', {
              code: ErrorCodes.AbortError,
            });
          });
        });

        describe('when the signal was aborted after starting the machine', function () {
          it('should exit with ERROR output', async function () {
            const ac = new AbortController();
            signal = ac.signal;

            const actor = createActor(ReporterMachine, {
              input: {
                def,
                plugin,
                smokerPkgJson,
                smokerOptions,
                signal,
              },
            });
            const promise = toPromise(actor);
            actor.start();
            ac.abort(new Error('abort'));
            await expect(promise, 'to be fulfilled with value satisfying', {
              type: ERROR,
              error: {
                code: ErrorCodes.MachineError,
              },
            });
          });
        });
      });

      describe('shutdown', function () {
        it('should always abort the drain queue', async function () {
          const actor = startMachine({
            def,
            plugin,
            smokerPkgJson,
            smokerOptions,
            signal,
          });

          actor.send({type: 'HALT'});
          await expect(
            runUntilSnapshot(
              (snapshot) =>
                snapshot.context.drainAbortController.signal.aborted,
              actor,
            ),
            'to be fulfilled',
          );
        });
      });
    });
  });
});
