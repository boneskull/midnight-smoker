import {
  NullPm,
  registerPlugin,
  runScriptRunner,
} from '@midnight-smoker/test-util';
import {ErrorCodes} from 'midnight-smoker/error';
import {ExecError} from 'midnight-smoker/executor';
import {
  PkgManagerSpec,
  type RunScriptManifest,
  type RunScriptResult,
} from 'midnight-smoker/pkg-manager';
import {PluginRegistry} from 'midnight-smoker/plugin';
import {
  RunScriptError,
  type ScriptError,
  type ScriptRunner,
  type ScriptRunnerEmitter,
} from 'midnight-smoker/script-runner';
import {EventEmitter} from 'node:events';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import {loadScriptRunner} from '../../src/script-runner';

const expect = unexpected
  .clone()
  .use(unexpectedEventEmitter)
  .use(unexpectedSinon);

const MOCK_TMPROOT = '/some/tmp';
const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

describe('@midnight-smoker/plugin-default', function () {
  describe('smokerScriptRunner', function () {
    let sandbox: sinon.SinonSandbox;
    let mockPm: NullPm;
    let manifest: RunScriptManifest;
    let emitter: ScriptRunnerEmitter;
    let registry: PluginRegistry;
    let smokerScriptRunner: ScriptRunner;

    beforeEach(async function () {
      sandbox = createSandbox();

      mockPm = new NullPm();
      registry = PluginRegistry.create();
      await registerPlugin(registry, {
        factory: loadScriptRunner,
      });

      emitter = new EventEmitter() as any;
      sandbox.spy(emitter, 'emit');
      manifest = {
        script: 'foo',
        pkgName: 'bar',
        cwd: `${MOCK_TMPDIR}/node_modules/bar`,
      };

      smokerScriptRunner = registry.getScriptRunner('test-plugin/default');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call the runScriptBegin notifier', async function () {
      await expect(
        () => runScriptRunner(smokerScriptRunner, manifest, mockPm, {emitter}),
        'to emit from',
        emitter,
        'RunScriptBegin',
      );
    });

    describe('when called without arguments', function () {
      it('should reject', async function () {
        await expect(
          // @ts-expect-error invalid args
          smokerScriptRunner(),
          'to be rejected',
        );
      });
    });

    describe('when the scripts succeed', function () {
      it('should call the runScriptOk notifier', async function () {
        await expect(
          () =>
            runScriptRunner(smokerScriptRunner, manifest, mockPm, {emitter}),
          'to emit from',
          emitter,
          'RunScriptOk',
        );
      });

      it(`should resolve with an array of run results`, async function () {
        await expect(
          runScriptRunner(smokerScriptRunner, manifest, mockPm, {emitter}),
          'to be fulfilled with value satisfying',
          [{pkgName: 'bar', script: 'foo'}],
        );
      });
    });

    describe('when the PackageManager rejects', function () {
      beforeEach(function () {
        sandbox.stub(mockPm, 'runScript').rejects(new Error('oh noes'));
      });

      it('should reject', async function () {
        await expect(
          runScriptRunner(smokerScriptRunner, manifest, mockPm, {emitter}),
          'to be rejected with error satisfying',
          {
            code: ErrorCodes.PackageManagerError,
            context: {pkgManager: 'nullpm@1.0.0'},
          },
        );
      });
    });

    describe('when a script fails', function () {
      let error: ScriptError;
      let innerError: ExecError;
      beforeEach(function () {
        innerError = new ExecError({
          exitCode: 1,
          command: 'some command',
          stderr: 'some stderr',
          stdout: 'some stdout',
        } as any);

        error = new RunScriptError(
          innerError,
          'some-script',
          'bar',
          PkgManagerSpec.create({pkgManager: 'nullpm', version: '1.0.0'}),
        );
        sandbox
          .stub(mockPm, 'runScript')
          .callThrough()
          .onFirstCall()
          .callsFake(async (runManifest): Promise<RunScriptResult> => {
            return {
              pkgName: runManifest.pkgName,
              error,
              script: runManifest.script,
              rawResult: {
                stdout: '',
                stderr: '',
                command: '',
                exitCode: 0,
                failed: false,
              },
              cwd: '/some/path',
            };
          });
      });

      it('should call the runScriptFailed notifier', async function () {
        await runScriptRunner(smokerScriptRunner, manifest, mockPm, {emitter});
        expect(emitter.emit, 'to have a call satisfying', [
          'RunScriptFailed',
          {
            pkgName: 'bar',
            error: expect.it('to be a', RunScriptError),
            script: 'foo',
            current: 0,
            total: 1,
          },
        ]);
      });

      describe('when the "bail" option is false', function () {
        it('should execute all scripts', async function () {
          await expect(
            runScriptRunner(smokerScriptRunner, manifest, mockPm, {
              emitter,
              bail: false,
            }),
            'to be fulfilled with value satisfying',
            [{pkgName: 'bar', error}],
          );
        });
      });

      describe('when the "bail" option is true', function () {
        it('should execute only until a script fails', async function () {
          await expect(
            runScriptRunner(smokerScriptRunner, manifest, mockPm, {
              emitter,
              bail: true,
            }),
            'to be fulfilled with value satisfying',
            expect.it('to have length', 1),
          );
        });
      });
    });
  });
});
