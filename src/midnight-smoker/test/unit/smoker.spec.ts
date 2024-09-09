import {ERROR, FAILED, FINAL, OK} from '#constants';
import {type SmokeMachineOutput} from '#machine/smoke-machine';
import {OptionsParser} from '#options/options-parser';
import {PluginRegistry} from '#plugin/registry';
import {
  type RawSmokerOptions,
  type SmokerOptions,
} from '#schema/smoker-options';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {Smoker} from '#smoker';
import {FileManager} from '#util/filemanager';
import {type Result} from '#util/result';
import {serialize} from '#util/serialize';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume.js';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type AnyStateMachine, setup} from 'xstate';

import {createPlugin} from './mocks/plugin.js';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(async function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Smoker', function () {
    describe('method', function () {
      let fs: Volume;
      let fileManager: FileManager;
      let pluginRegistry: PluginRegistry;
      let mockSmokeMachine: AnyStateMachine;
      let outputStub: sinon.SinonStub;
      let smokeMachineOutput: SmokeMachineOutput;
      let smoker: Smoker;
      let opts: RawSmokerOptions;

      beforeEach(async function () {
        opts = {script: 'foo'};
        const {vol} = memfs();
        fs = vol;
        fileManager = FileManager.create({fs: fs as any});
        pluginRegistry = PluginRegistry.create({
          blessedPluginIds: ['test-plugin'],
          fileManager,
        });
        await pluginRegistry.registerPlugin('test-plugin', createPlugin());

        smokeMachineOutput = {
          actorId: 'test',
          lint: [],
          pkgManagers: [],
          plugins: serialize(pluginRegistry.plugins),
          scripts: [],
          smokerOptions: {} as SmokerOptions,
          success: true,
          type: OK,
          workspaceInfo: [] as Result<WorkspaceInfo>[],
        };
        outputStub = sandbox.stub().returns(smokeMachineOutput);
        const machine = setup({
          types: {
            context: {} as {shouldShutdown: boolean},
            input: {} as {shouldShutdown: boolean},
          },
        }).createMachine({
          context: ({input: {shouldShutdown}}) => ({shouldShutdown}),
          id: 'test',
          initial: 'ready',
          output: outputStub,
          states: {
            delay: {
              after: {
                50: 'done',
              },
            },
            done: {
              type: FINAL,
            },
            ready: {
              always: {
                guard: ({context: {shouldShutdown}}) => shouldShutdown,
                target: 'delay',
              },
            },
          },
        });
        mockSmokeMachine = machine as any;
        smoker = await Smoker.createWithCapabilities(opts, {
          fileManager,
          logic: mockSmokeMachine as any,
          pluginRegistry,
        });
      });

      describe('smoke()', function () {
        describe('when completed successfully', function () {
          it('should fulfill with a SmokeResultsOk object', async function () {
            await expect(
              smoker.smoke(),
              'to be fulfilled with value exhaustively satisfying',
              {
                actorId: 'test',
                lint: [],
                pkgManagers: [],
                plugins: pluginRegistry.plugins,
                scripts: [],
                smokerOptions: OptionsParser.create(pluginRegistry).parse(opts),
                success: true,
                type: OK,
                workspaceInfo: [],
              },
            );
          });
        });

        describe('when completed unsuccessfully', function () {
          it('should fulfill with a SmokeResultsFailed object', async function () {
            outputStub.returns({
              actorId: 'test',
              type: FAILED,
            });
            await expect(
              smoker.smoke(),
              'to be fulfilled with value exhaustively satisfying',
              {
                actorId: 'test',
                plugins: pluginRegistry.plugins,
                smokerOptions: OptionsParser.create(pluginRegistry).parse(opts),
                type: FAILED,
              },
            );
          });
        });

        describe('when completed with error', function () {
          it('should fulfill with a SmokeResultsError object', async function () {
            const error = new Error('test');
            outputStub.returns({
              actorId: 'test',
              error,
              type: ERROR,
            });
            await expect(
              smoker.smoke(),
              'to be fulfilled with value satisfying',
              {
                actorId: 'test',
                error,
                plugins: pluginRegistry.plugins,
                smokerOptions: OptionsParser.create(pluginRegistry).parse(opts),
                type: ERROR,
              },
            );
          });
        });
      });
    });

    describe('static method', function () {
      describe('smoke()', function () {
        let smokerStub: sinon.SinonStubbedInstance<Smoker>;

        beforeEach(async function () {
          smokerStub = sandbox.createStubInstance(Smoker);
          sandbox.stub(Smoker, 'create').resolves(smokerStub);
          await Smoker.smoke({script: 'foo'});
        });

        it('should delegate to Smoker.create()', async function () {
          expect(Smoker.create, 'was called once');
        });

        it('should delegate to Smoker.prototype.smoke()', async function () {
          expect(smokerStub.smoke, 'was called once');
        });
      });

      describe('create()', function () {
        it('should throw if both non-empty "workspace" and true "all" options are provided', async function () {
          await expect(
            Smoker.create({all: true, workspace: ['foo']}),
            'to be rejected with error satisfying',
            /Option "workspace" is mutually exclusive with "all"/,
          );
        });

        describe('when not provided options', function () {
          it('should not throw', async function () {
            await expect(Smoker.create(), 'to be fulfilled');
          });
        });

        it('should return a Smoker instance', async function () {
          await expect(
            Smoker.create({}),
            'to be fulfilled with value satisfying',
            expect.it('to be a', Smoker),
          );
        });
      });

      describe('getPkgManagers()', function () {
        it('should return an array of objects of type `PkgManager & Component`', async function () {
          await expect(
            Smoker.getPkgManagers(),
            'when fulfilled',
            'to have items satisfying',
            {
              bin: expect.it('to be a string'),
              id: expect.it('to be a string'),
              install: expect.it('to be a function'),
              lockfile: expect.it('to be a string'),
              pack: expect.it('to be a function'),
              pluginName: expect.it('to be a string'),
              runScript: expect.it('to be a function'),
            },
          );
        });
      });

      describe('getReporters()', function () {
        it('should return an array of objects of type `SomeReporterDef & Component`', async function () {
          await expect(
            Smoker.getReporters(),
            'when fulfilled',
            'to have items satisfying',
            {
              description: expect.it('to be a string'),
              id: expect.it('to be a string'),
              name: expect.it('to be a string'),
              pluginName: expect.it('to be a string'),
            },
          );
        });
      });

      describe('getPlugins()', function () {
        it('should return an array of StaticPluginMetadata objects', async function () {
          await expect(
            Smoker.getPlugins(),
            'when fulfilled',
            'to have items satisfying',
            {
              description: expect.it('to be a string'),
              entryPoint: expect.it('to be a string'),
              id: expect.it('to be a string'),
            },
          );
        });
      });

      describe('getRules()', function () {
        it('should return an array of objects of type `SomeRuleDef & Component`', async function () {
          await expect(
            Smoker.getRules(),
            'when fulfilled',
            'to have items satisfying',
            {
              check: expect.it('to be a function'),
              description: expect.it('to be a string'),
              id: expect.it('to be a string'),
              name: expect.it('to be a string'),
              pluginName: expect.it('to be a string'),
            },
          );
        });
      });

      describe('createWithCapabilities()', function () {
        let pluginRegistry: PluginRegistry;

        beforeEach(async function () {
          pluginRegistry = PluginRegistry.create();
          sandbox.stub(pluginRegistry, 'registerPlugins').resolves([]);
        });

        it('should throw if both non-empty "workspace" and true "all" options are provided', async function () {
          await expect(
            Smoker.createWithCapabilities(
              {all: true, workspace: ['foo']},
              {pluginRegistry},
            ),
            'to be rejected with error satisfying',
            /Option "workspace" is mutually exclusive with "all"/,
          );
        });

        describe('when not passed any scripts at all', function () {
          it('should not throw', async function () {
            await expect(
              Smoker.createWithCapabilities({}, {pluginRegistry}),
              'to be fulfilled',
            );
          });
        });

        it('should return a Smoker instance', async function () {
          await expect(
            Smoker.createWithCapabilities({}, {pluginRegistry}),
            'to be fulfilled with value satisfying',
            expect.it('to be a', Smoker),
          );
        });
      });
    });
  });
});
