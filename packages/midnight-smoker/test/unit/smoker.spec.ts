import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {DEFAULT_COMPONENT_ID, SYSTEM_EXECUTOR_ID} from '../../src/constants';
import {type ExecResult} from '../../src/executor';
import {PluginRegistry} from '../../src/plugin/plugin-registry';
import {Smoker} from '../../src/smoker';
import {FileManager} from '../../src/util';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;
  let fs: Volume;
  let fileManager: FileManager;

  let pluginRegistry: PluginRegistry;
  beforeEach(function () {
    sandbox = createSandbox();
    const {vol} = memfs();
    fs = vol;
    fileManager = FileManager.create({fs: fs as any});
    pluginRegistry = PluginRegistry.create({fileManager});
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Smoker', function () {
    describe('method', function () {
      let smoker: Smoker;

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
        smoker = await Smoker.createWithCapabilities(
          {script: 'foo'},
          {
            fileManager,
            pluginRegistry,
          },
        );
      });

      describe('smoke()', function () {
        beforeEach(async function () {
          // sandbox.stub(smoker, 'runScripts').resolves([]);
          // sandbox.stub(smoker, 'runLint').resolves({passed: [], issues: []});
          // sandbox.stub(smoker, 'pack').resolves();
          // sandbox.stub(smoker, 'install').resolves();
          await smoker.smoke();
        });

        // it('should initialize the PkgManagerController', function () {
        //   expect(pkgManagerController.init, 'was called once');
        // });

        // it('should initialize the ReporterController', function () {
        //   expect(reporterController.init, 'was called once');
        // });

        it('should install packages', function () {
          // expect(smoker.pack, 'was called once');
        });

        it('should pack packages', function () {
          // expect(smoker.pack, 'was called once');
        });

        describe('when provided scripts', function () {
          it('should run scripts', function () {
            // expect(smoker.runScripts, 'was called once');
          });
        });

        describe('when checks enabled', function () {
          it('it should run checks', function () {
            // expect(smoker.runLint, 'was called once');
          });
        });
      });

      describe('runLint()', function () {
        beforeEach(async function () {
          // await smoker.runLint();
        });

        it('should delegate to the LintController', function () {
          // expect(lintController.lint, 'was called once');
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
