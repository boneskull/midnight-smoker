import {ErrorCode} from '#error/codes';
import {exec} from '#util/exec';
import {RegisteredChildProcess} from '#util/preamble';
import Debug from 'debug';
import {vol} from 'memfs';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

import {monorepoStructure} from '../mocks/volume';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('exec', function () {
      let sandbox: sinon.SinonSandbox;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        vol.fromJSON(monorepoStructure);
      });

      afterEach(function () {
        sandbox.restore();
      });

      it('should execute a command successfully', async function () {
        const result = await exec(process.execPath, [
          '-e',
          `console.log('hello')`,
        ]);
        expect(result, 'to satisfy', {
          exitCode: 0,
          stdout: 'hello',
        });
      });

      describe('when command fails to spawn', function () {
        it('should reject with a SpawnError', async function () {
          await expect(
            exec('nonexistent-command'),
            'to be rejected with error satisfying',
            {code: ErrorCode.SpawnError},
          );
        });
      });

      describe('when command times out', function () {
        it('should throw an AbortError', async function () {
          await expect(
            exec(process.execPath, ['-e', 'while(true)'], {timeout: 10}),
            'to be rejected with error satisfying',
            {code: ErrorCode.AbortError},
          );
        });

        it('should kill the child process', async function () {
          sandbox.spy(RegisteredChildProcess.prototype, 'terminate');
          await expect(
            exec(process.execPath, ['-e', 'while(true)'], {timeout: 10}),
            'to be rejected with error satisfying',
            {code: ErrorCode.AbortError},
          );
          expect(RegisteredChildProcess.prototype.terminate, 'was called once');
        });
      });

      describe('when verbose option is enabled', function () {
        let namespaces: string;

        beforeEach(function () {
          // debug output messes with stderr
          namespaces = Debug.disable();
        });

        afterEach(function () {
          Debug.enable(namespaces);
        });

        it('should write output to process stdout & stderr', async function () {
          const stdoutSpy = sandbox.spy(process.stdout, 'write');
          const stderrSpy = sandbox.spy(process.stderr, 'write');

          await exec('echo', ['hello'], {verbose: true});

          expect(stdoutSpy, 'was called with', 'hello\n');
          expect(stderrSpy, 'was not called');
        });
      });

      describe('when onSpawn option is provided', function () {
        it('should call onSpawn with the child process and signal', async function () {
          const onSpawnSpy = sandbox.spy();

          await exec('echo', ['hello'], {onSpawn: onSpawnSpy});

          expect(onSpawnSpy, 'was called');
        });
      });
    });
  });
});
