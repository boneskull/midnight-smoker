import {
  NullPm,
  registerPlugin,
  runScriptRunner,
} from '@midnight-smoker/test-util';
import {
  Executor,
  ScriptRunner,
  type PluginRegistry,
} from 'midnight-smoker/plugin';
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

const MOCK_PM_ID = 'nullpm@1.0.0';
const MOCK_TMPROOT = '/some/tmp';
const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

describe('@midnight-smoker/plugin-default', function () {
  describe('smokerScriptRunner', function () {
    let sandbox: sinon.SinonSandbox;
    let mockPm: NullPm;
    let pkgRunManifest: ScriptRunner.PkgManagerRunScriptManifest;
    let emitter: ScriptRunner.ScriptRunnerEmitter;
    let registry: PluginRegistry;
    let smokerScriptRunner: ScriptRunner.ScriptRunner;

    beforeEach(async function () {
      sandbox = createSandbox();

      mockPm = new NullPm(MOCK_PM_ID);
      registry = await registerPlugin({
        factory: loadScriptRunner,
      });

      emitter = new EventEmitter() as any;
      sandbox.spy(emitter, 'emit');
      pkgRunManifest = {
        pkgManager: mockPm,
        script: 'foo',
        pkgName: 'bar',
        spec: 'bar',
        cwd: `${MOCK_TMPDIR}/node_modules/bar`,
      };

      smokerScriptRunner = registry.getScriptRunner('test-plugin/default');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call the runScriptBegin notifier', async function () {
      await expect(
        () => runScriptRunner(smokerScriptRunner, pkgRunManifest, {emitter}),
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
          () => runScriptRunner(smokerScriptRunner, pkgRunManifest, {emitter}),
          'to emit from',
          emitter,
          'RunScriptOk',
        );
      });

      it(`should resolve with an array of run results`, async function () {
        await expect(
          runScriptRunner(smokerScriptRunner, pkgRunManifest, {emitter}),
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
          runScriptRunner(smokerScriptRunner, pkgRunManifest, {emitter}),
          'to be rejected with error satisfying',
          {code: 'ESMOKER_PACKAGEMANAGER', context: {spec: MOCK_PM_ID}},
        );
      });
    });

    describe('when a script fails', function () {
      let error: ScriptRunner.ScriptError;
      let innerError: Executor.ExecError;
      beforeEach(function () {
        innerError = new Executor.ExecError({
          exitCode: 1,
          command: 'some command',
          stderr: 'some stderr',
          stdout: 'some stdout',
        } as any);

        error = new ScriptRunner.RunScriptError(
          innerError,
          'some-script',
          'bar',
          MOCK_PM_ID,
        );
        sandbox
          .stub(mockPm, 'runScript')
          .callThrough()
          .onFirstCall()
          .callsFake(
            async (runManifest): Promise<ScriptRunner.RunScriptResult> => {
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
            },
          );
      });

      it('should call the runScriptFailed notifier', async function () {
        await runScriptRunner(smokerScriptRunner, pkgRunManifest, {emitter});
        expect(emitter.emit, 'to have a call satisfying', [
          'RunScriptFailed',
          {
            pkgName: 'bar',
            error: expect.it('to be a', ScriptRunner.RunScriptError),
            script: 'foo',
            current: 0,
            total: 1,
          },
        ]);
      });

      describe('when the "bail" option is false', function () {
        it('should execute all scripts', async function () {
          await expect(
            runScriptRunner(smokerScriptRunner, pkgRunManifest, {
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
            runScriptRunner(smokerScriptRunner, pkgRunManifest, {
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
