import {
  getChildProcesses,
  registerChildProcess,
  type RegisteredChildProcess,
  reset,
} from '#util/preamble';
import {type ChildProcess} from 'child_process';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('process', function () {
      let sandbox: sinon.SinonSandbox;
      let childProcess: ChildProcess;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        childProcess = {
          exitCode: null,
          kill: sandbox.stub(),
          killed: false,
          pid: 12345,
        } as any;
        reset();
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('registerChildProcess()', function () {
        let registered: RegisteredChildProcess;

        beforeEach(function () {
          registered = registerChildProcess(childProcess);
        });

        afterEach(async function () {
          if (registered) {
            try {
              await registered[Symbol.asyncDispose]();
            } catch {}
          }
        });

        it('should return a RegisteredChildProcess', function () {
          expect(registered.proc, 'to be', childProcess);
        });

        it('should return the same RegisteredChildProcess if already registered', function () {
          expect(registerChildProcess(childProcess), 'to be', registered);
        });

        describe('if the child process has no pid', function () {
          it('should throw', function () {
            expect(
              () =>
                registerChildProcess({...childProcess, pid: undefined} as any),
              'to throw a',
              TypeError,
            );
          });
        });
      });

      describe('when disposing a child process', function () {
        it('should remove the child process from the set', async function () {
          const rcp = registerChildProcess(childProcess);
          sandbox.stub(rcp, 'terminate').resolves();
          await rcp[Symbol.asyncDispose]();
          expect(getChildProcesses(), 'not to contain', rcp);
        });

        it('should terminate the child process if it was not killed and has no exitCode', async function () {
          // @ts-expect-error read-only prop
          childProcess.exitCode = null;
          // @ts-expect-error read-only prop
          childProcess.killed = false;
          const rcp = registerChildProcess(childProcess);
          const terminate = sandbox.stub(rcp, 'terminate').resolves();
          await rcp[Symbol.asyncDispose]();
          expect(terminate, 'was called once');
        });

        it('should terminate the child process even if already killed', async function () {
          // @ts-expect-error read-only prop
          childProcess.killed = true;
          const result = registerChildProcess(childProcess);
          const terminate = sandbox.stub(result, 'terminate').resolves();
          await result[Symbol.asyncDispose]();
          expect(terminate, 'was called');
        });

        it('should not terminate the child process if exitCode is 0', async function () {
          // @ts-expect-error read-only prop
          childProcess.exitCode = 0;
          const rcp = registerChildProcess(childProcess);
          const terminate = sandbox.stub(rcp, 'terminate').resolves();
          await rcp[Symbol.asyncDispose]();
          expect(terminate, 'was not called');
        });

        it('should not terminate the child process if exitCode is 1', async function () {
          // @ts-expect-error read-only prop
          childProcess.exitCode = 1;
          const rcp = registerChildProcess(childProcess);
          const terminate = sandbox.stub(rcp, 'terminate').resolves();
          await rcp[Symbol.asyncDispose]();
          expect(terminate, 'was not called');
        });
      });
    });
  });
});
