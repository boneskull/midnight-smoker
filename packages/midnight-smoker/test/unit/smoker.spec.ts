import {PluginRegistry} from '#plugin/plugin-registry';
// import {NullPkgManagerController} from '@midnight-smoker/test-util/controller';
import {
  createExecaMock,
  type ExecaMock,
} from '@midnight-smoker/test-util/execa';
// import {NullPm} from '@midnight-smoker/test-util/pkg-manager';
// import {
//   LintController,
//   PkgManagerController,
//   ReporterController,
// } from '#controller';
import type * as MS from '#smoker';
import {registerRule} from '@midnight-smoker/test-util/register';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import {z} from 'zod';
import * as Mocks from './mocks';
import {createFsMocks, type FsMocks} from './mocks/fs';

const expect = unexpected
  .clone()
  .use(unexpectedSinon)
  .use(unexpectedEventEmitter);

// const {MOCK_TMPDIR} = Mocks;

interface SmokerSpecMocks extends FsMocks {
  'node:console': sinon.SinonStubbedInstance<typeof console>;
  debug?: Mocks.DebugMock;
  execa: ExecaMock;
}

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;
  let Smoker: typeof MS.Smoker;
  let mocks: SmokerSpecMocks;
  // let pkgManagerController: sinon.SinonStubbedInstance<PkgManagerController>;
  // let reporterController: sinon.SinonStubbedInstance<ReporterController>;

  // let rmStub: sinon.SinonStubbedMember<typeof fs.promises.rm>;
  let fsMocks: FsMocks;
  // let lintController: sinon.SinonStubbedInstance<LintController>;

  let pluginRegistry: PluginRegistry;
  beforeEach(function () {
    sandbox = createSandbox();
    const execaMock = createExecaMock();
    ({mocks: fsMocks} = createFsMocks());
    // reporterController = sandbox.createStubInstance(ReporterController, {
    //   init: sandbox.stub<[]>().resolves(),
    // });
    // pkgManagerController = Object.assign(
    //   sandbox.createStubInstance(PkgManagerController),
    //   {
    //     init: sandbox.stub<[]>().resolves(),
    //   },
    // );
    // lintController = sandbox.createStubInstance(LintController);
    mocks = {
      ...fsMocks,
      execa: execaMock,
      'node:console': sandbox.stub(console),
      debug: Mocks.mockDebug,
      // '#controller': {
      //   LintController: {create: sandbox.stub().returns(lintController)},
      //   PkgManagerController: {
      //     create: sandbox.stub().returns(pkgManagerController),
      //   },
      //   ReporterController: {
      //     create: sandbox.stub().returns(reporterController),
      //   },
      // },
    };
    // rmStub = sandbox.stub(fs.promises, 'rm');

    // don't stub out debug statements if running in wallaby
    if (process.env.WALLABY) {
      delete mocks.debug;
    }

    pluginRegistry = PluginRegistry.create();

    // lintController = Object.assign(sandbox.createStubInstance(LintController), {
    //   rules: [],
    // });

    ({Smoker} = rewiremock.proxy(() => require('../../src/smoker'), mocks));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Smoker', function () {
    describe('method', function () {
      let smoker: MS.Smoker;

      beforeEach(async function () {
        smoker = await Smoker.createWithCapabilities(
          {script: 'foo'},
          {
            pluginRegistry,
          },
        );
      });

      describe('pack()', function () {
        beforeEach(async function () {
          // await smoker.pack();
        });

        // it('should delegate to the PkgManagerController', function () {
        //   expect(pkgManagerController.pack, 'to have a call satisfying', [
        //     {
        //       allWorkspaces: false,
        //       workspaces: [],
        //       includeWorkspaceRoot: false,
        //     },
        //   ]);
        // });
      });

      describe('install()', function () {
        beforeEach(async function () {
          // await smoker.install();
        });

        // it('should delegate to the PkgManagerController', function () {
        //   expect(pkgManagerController.install, 'was called once');
        // });
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
      let registry: PluginRegistry;

      beforeEach(async function () {
        registry = PluginRegistry.create();
        await registerRule(registry, {
          name: 'test-rule',
          schema: z.object({foo: z.string().default('bar')}),
        });
        sandbox.stub(registry, 'loadPlugins').resolves(registry);
      });

      describe('smoke()', function () {
        let smokerStub: sinon.SinonStubbedInstance<MS.Smoker>;

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
              {pluginRegistry: registry},
            ),
            'to be rejected with error satisfying',
            /Option "workspace" is mutually exclusive with "all"/,
          );
        });

        describe('when not passed any scripts at all', function () {
          it('should not throw', async function () {
            await expect(
              Smoker.createWithCapabilities({}, {pluginRegistry: registry}),
              'to be fulfilled',
            );
          });
        });

        it('should return a Smoker instance', async function () {
          await expect(
            Smoker.createWithCapabilities({}, {pluginRegistry: registry}),
            'to be fulfilled with value satisfying',
            expect.it('to be a', Smoker),
          );
        });
      });
    });
  });
});
