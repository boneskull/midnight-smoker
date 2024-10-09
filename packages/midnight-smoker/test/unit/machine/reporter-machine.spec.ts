import {ERROR, Events} from '#constants';
import {type Reporter} from '#defs/reporter';
import {ErrorCode} from '#error/codes';
import {ReporterMachine} from '#machine/reporter-machine';
import {OptionsParser} from '#options/options-parser';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {PluginRegistry} from '#plugin/registry';
import {type PackageJson} from '#schema/package-json';
import {type SmokerOptions} from '#schema/smoker-options';
import {FileManager} from '#util/filemanager';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {createDebug} from '../../debug';
import {nullReporter} from '../mocks/component';

const expect = unexpected.clone().use(unexpectedSinon);

const logger = createDebug(__filename);

// TODO: extract actor tests to a separate file
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
      let reporter: Reporter;
      let setup: sinon.SinonStub;
      let teardown: sinon.SinonStub;
      let actor: Actor<typeof ReporterMachine>;
      const id = 'ReporterMachine';

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({
          fileManager,
        });
        sandbox = createSandbox();
        reporter = {...nullReporter};
        plugin = await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.defineReporter(nullReporter);
          },
        });
        smokerOptions = OptionsParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          reporter: 'test-plugin/test-reporter',
        });
        setup = sandbox.stub(reporter, 'setup').resolves();
        teardown = sandbox.stub(reporter, 'teardown').resolves();
        const input = {
          plugin,
          reporter,
          smokerOptions,
          smokerPkgJson,
        };
        actor = createActor(ReporterMachine, {id, input, logger});
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('lifecycle hooks', function () {
        it('should call the "setup" lifecycle hook', async function () {
          const p = runUntilDone(actor);
          actor.send({type: 'HALT'});
          await p;
          expect(reporter.setup, 'was called once');
        });

        it('should call the "teardown" lifecycle hook', async function () {
          const p = runUntilDone(actor);
          actor.send({type: 'HALT'});
          await p;
          expect(reporter.teardown, 'was called once');
        });

        describe('when the "setup" lifecycle hook rejects', function () {
          it('should exit with ERROR output', async function () {
            setup.rejects(new Error('test error'));
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  code: ErrorCode.MachineError,
                  errors: [
                    {
                      code: ErrorCode.LifecycleError,
                      context: {
                        kind: 'reporter',
                        stage: 'setup',
                      },
                    },
                  ],
                },
                type: ERROR,
              },
            );
          });
        });

        describe('when the "teardown" lifecycle hook rejects', function () {
          it('should exit with ERROR output', async function () {
            teardown.rejects(new Error('test error'));
            const p = runUntilDone(actor);
            actor.send({type: 'HALT'});
            await expect(p, 'to be fulfilled with value satisfying', {
              error: {
                code: ErrorCode.MachineError,
                errors: [
                  {
                    code: ErrorCode.LifecycleError,
                    context: {
                      kind: 'reporter',
                      stage: 'teardown',
                    },
                  },
                ],
              },
              type: ERROR,
            });
          });
        });

        describe('when both hooks reject', function () {
          it('should exit with ERROR output, aggregating the errors', async function () {
            setup.rejects(new Error('setup error'));
            teardown.rejects(new Error('teardown error'));
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  code: ErrorCode.MachineError,
                  errors: [
                    {
                      code: ErrorCode.LifecycleError,
                      context: {
                        kind: 'reporter',
                        stage: 'setup',
                      },
                    },
                    {
                      code: ErrorCode.LifecycleError,
                      context: {
                        kind: 'reporter',
                        stage: 'teardown',
                      },
                    },
                  ],
                },
                type: ERROR,
              },
            );
          });
        });
      });

      describe('event handling', function () {
        let onBeforeExit: sinon.SinonStub;
        let onNoop: sinon.SinonStub;

        beforeEach(function () {
          onBeforeExit = sandbox.stub();
          onNoop = sandbox.stub();
          actor = createActor(ReporterMachine, {
            id,
            input: {
              plugin,
              reporter: {...reporter, onBeforeExit, onNoop},
              smokerOptions,
              smokerPkgJson,
            },
            logger,
          });
        });

        afterEach(function () {
          actor?.stop();
        });

        describe('event EVENT', function () {
          it('should invoke the appropriate event listener in the reporter', async function () {
            const p = runUntilDone(actor);
            actor.send({
              event: {type: Events.Noop},
              type: 'EVENT',
            });
            actor.send({type: 'HALT'});
            await p;
            expect(onNoop, 'was called once');
          });

          describe('when an event listener rejects', function () {
            it('should exit with ERROR output', async function () {
              onBeforeExit.rejects(new Error('test error'));
              actor.send({
                event: {type: Events.BeforeExit},
                type: 'EVENT',
              });
              actor.send({
                event: {type: Events.Noop},
                type: 'EVENT',
              });
              await expect(
                runUntilDone(actor),
                'to be fulfilled with value satisfying',
                {
                  error: {
                    code: ErrorCode.MachineError,
                    errors: [
                      {
                        code: ErrorCode.ReporterError,
                      },
                    ],
                  },
                  type: ERROR,
                },
              );
            });

            it('should not invoke listeners after one has failed', async function () {
              onBeforeExit.rejects(new Error('test error'));
              actor.send({
                event: {type: Events.Noop},
                type: 'EVENT',
              });
              actor.send({
                event: {type: Events.BeforeExit},
                type: 'EVENT',
              });
              actor.send({
                event: {type: Events.Noop},
                type: 'EVENT',
              });
              await runUntilDone(actor);

              expect(onNoop, 'was called once');
            });
          });

          describe('when events are received during shutdown', function () {
            it('should ignore the events', async function () {
              actor.send({
                event: {type: Events.Noop},
                type: 'EVENT',
              });
              actor.send({
                event: {type: Events.Noop},
                type: 'EVENT',
              });
              actor.send({type: 'HALT'});
              actor.send({
                event: {type: Events.Noop},
                type: 'EVENT',
              });
              actor.send({
                event: {type: Events.Noop},
                type: 'EVENT',
              });
              await runUntilDone(actor);
              expect(onNoop, 'was called twice');
            });
          });
        });

        describe('event HALT', function () {
          it('should stop the machine after draining the queue', async function () {
            actor.send({
              event: {type: Events.BeforeExit},
              type: 'EVENT',
            });
            actor.send({type: 'HALT'});
            await runUntilDone(actor);
            expect(onBeforeExit, 'was called once');
            expect(actor.getSnapshot().status, 'to be', 'done');
          });
        });
      });
    });
  });
});
