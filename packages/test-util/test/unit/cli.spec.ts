import {type ExecResult} from 'midnight-smoker/executor';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

import {execSmoker} from '../../src/cli';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('test-util', function () {
    describe('cli', function () {
      describe('execSmoker()', function () {
        let sandbox: sinon.SinonSandbox;
        let execaStub: sinon.SinonStub;

        beforeEach(function () {
          sandbox = sinon.createSandbox();
          execaStub = sandbox.stub().resolves({
            stdout: JSON.stringify({success: true}),
          } as ExecResult);
        });

        afterEach(function () {
          sandbox.restore();
        });

        it('should execute smoker with given arguments', async function () {
          const args = ['run', 'smoke'];
          const opts = {cwd: '/some/path'};
          await execSmoker(args, opts);

          expect(execaStub, 'was called with', [
            'smoker',
            args,
            {
              env: {...process.env, DEBUG: ''},
              ...opts,
            },
          ]);
        });

        it('should add --json flag if json option is true', async function () {
          const args = ['run', 'smoke'];
          const opts = {cwd: '/some/path', json: true};
          await execSmoker(args, opts);

          expect(execaStub, 'was called with', [
            'smoker',
            [...args, '--json'],
            {
              env: {...process.env, DEBUG: ''},
              ...opts,
            },
          ]);
        });

        it('should parse JSON output if json option is true', async function () {
          const args = ['run', 'smoke'];
          const opts = {cwd: '/some/path', json: true};
          const result = await execSmoker(args, opts);

          expect(result, 'to equal', {success: true});
        });

        it('should throw an error if execution fails', async function () {
          const args = ['run', 'smoke'];
          const opts = {cwd: '/some/path'};
          const error = new Error('Execution failed');
          execaStub.rejects(error);

          await expect(execSmoker(args, opts), 'to be rejected with', error);
        });

        it('should parse JSON error output if json option is true and execution fails', async function () {
          const args = ['run', 'smoke'];
          const opts = {cwd: '/some/path', json: true};
          const error = new Error('Execution failed') as any;
          error.stdout = JSON.stringify({error: 'Something went wrong'});
          execaStub.rejects(error);

          await expect(execSmoker(args, opts), 'to be rejected with', {
            error: 'Something went wrong',
          });
        });
      });
    });
  });
});
