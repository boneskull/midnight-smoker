import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {setup, type AnyStateMachine} from 'xstate';
import {
  DEFAULT_COMPONENT_ID,
  FINAL,
  SYSTEM_EXECUTOR_ID,
} from '../../src/constants';
import {type SmokeResults} from '../../src/event';
import {type ExecResult} from '../../src/executor';
import {type CtrlMachineOutput} from '../../src/machine/control';
import {type RawSmokerOptions} from '../../src/options/options';
import {OptionParser} from '../../src/options/parser';
import {PluginRegistry} from '../../src/plugin/plugin-registry';
import {type Result, type WorkspaceInfo} from '../../src/schema/workspaces';
import {Smoker} from '../../src/smoker';
import {FileManager} from '../../src/util/filemanager';
import {serialize} from '../../src/util/serialize';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;
  let fs: Volume;
  let fileManager: FileManager;
  let pluginRegistry: PluginRegistry;

  let mockControlMachine: AnyStateMachine;
  let outputStub: sinon.SinonStub;
  let controlOutput: CtrlMachineOutput;
  beforeEach(function () {
    sandbox = createSandbox();
    const {vol} = memfs();
    fs = vol;
    fileManager = FileManager.create({fs: fs as any});
    pluginRegistry = PluginRegistry.create({fileManager});
    controlOutput = {
      runScriptResults: [],
      lintResults: [],
      type: 'OK',
      id: 'test',
      workspaceInfo: [] as Result<WorkspaceInfo>[],
      pkgManagers: [],
      plugins: serialize(pluginRegistry.plugins),
    };
    outputStub = sandbox.stub().returns(controlOutput);
    mockControlMachine = setup({
      types: {input: {} as {shouldShutdown: boolean}},
    }).createMachine({
      id: 'test',
      context: ({input: {shouldShutdown}}) => ({shouldShutdown}),
      initial: 'ready',
      states: {
        ready: {
          always: {
            guard: ({context: {shouldShutdown}}) => shouldShutdown,
            target: 'delay',
          },
        },
        delay: {
          after: {
            50: 'done',
          },
        },
        done: {
          type: FINAL,
        },
      },
      output: outputStub,
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Smoker', function () {
    describe('method', function () {
      let smoker: Smoker;
      let opts: RawSmokerOptions;

      beforeEach(async function () {
        await pluginRegistry.registerPlugin('@midnight-smoker/plugin-default', {
          plugin: ({defineExecutor}) => {
            defineExecutor(async () => {
              return {} as ExecResult;
            }, DEFAULT_COMPONENT_ID);
            defineExecutor(async () => {
              return {} as ExecResult;
            }, SYSTEM_EXECUTOR_ID);
          },
        });
        opts = {script: 'foo'};
        smoker = await Smoker.createWithCapabilities(opts, {
          fileManager,
          pluginRegistry,
          controlMachine: mockControlMachine,
        });
      });

      describe('smoke()', function () {
        let result: SmokeResults;
        beforeEach(async function () {
          result = await smoker.smoke();
        });

        describe('when completed successfully', function () {
          it('should fulfill with a SmokeResults object', function () {
            expect(result, 'to satisfy', {
              scripts: [],
              lint: [],
              plugins: pluginRegistry.plugins,
              opts: OptionParser.create(pluginRegistry).parse(opts),
            });
          });
        });

        describe('when completed unsuccessfully', function () {
          // TODO fix
          it('should reject with an error', async function () {
            outputStub.returns({
              type: 'ERROR',
              error: new Error('test'),
              id: 'test',
            });
            await expect(smoker.smoke(), 'to be rejected');
          });
        });
      });
    });

    describe('static method', function () {
      let pluginRegistry: PluginRegistry;

      beforeEach(async function () {
        pluginRegistry = PluginRegistry.create();
        // await registerRule(registry, {
        //   name: 'test-rule',
        //   schema: z.object({foo: z.string().default('bar')}),
        // });
        sandbox
          .stub(pluginRegistry, 'registerPlugins')
          .resolves(pluginRegistry);
      });

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
        beforeEach(function () {
          sandbox
            // @ts-expect-error private
            .stub(Smoker, 'bootstrap')
            .callsFake(async (opts = {}) => ({options: opts}));
        });

        it('should throw if both non-empty "workspace" and true "all" options are provided', async function () {
          await expect(
            Smoker.create({workspace: ['foo'], all: true}),
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
        it('should return an array of objects of type `PkgManagerDef & Component`', async function () {
          await expect(
            Smoker.getPkgManagers(),
            'when fulfilled',
            'to have items satisfying',
            {
              bin: expect.it('to be a string'),
              lockfile: expect.it('to be a string'),
              install: expect.it('to be a function'),
              pack: expect.it('to be a function'),
              runScript: expect.it('to be a function'),
              id: expect.it('to be a string'),
              pluginName: expect.it('to be a string'),
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
              name: expect.it('to be a string'),
              description: expect.it('to be a string'),
              id: expect.it('to be a string'),
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
              id: expect.it('to be a string'),
              entryPoint: expect.it('to be a string'),
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
              name: expect.it('to be a string'),
              description: expect.it('to be a string'),
              check: expect.it('to be a function'),
              id: expect.it('to be a string'),
              pluginName: expect.it('to be a string'),
            },
          );
        });
      });

      describe('createWithCapabilities()', function () {
        it('should throw if both non-empty "workspace" and true "all" options are provided', async function () {
          await expect(
            Smoker.createWithCapabilities(
              {workspace: ['foo'], all: true},
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
