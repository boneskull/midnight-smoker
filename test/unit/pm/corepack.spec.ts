import {Readable} from 'node:stream';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import type {CorepackExecutor as _CorepackExecutor} from '../../../src/pm/corepack';
import unexpectedSinon from 'unexpected-sinon';
import unexpected from 'unexpected';
import {ExecaMock, createExecaMock} from '../mocks';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('Executor', function () {
    let CorepackExecutor: typeof _CorepackExecutor;
    let sandbox: sinon.SinonSandbox;
    let stdout: sinon.SinonStubbedInstance<Readable>;
    let stderr: sinon.SinonStubbedInstance<Readable>;
    let execaMock: ExecaMock;

    beforeEach(function () {
      sandbox = createSandbox();
      stdout = sandbox.createStubInstance(Readable);
      stderr = sandbox.createStubInstance(Readable);
      execaMock = createExecaMock({stdout, stderr});
      ({CorepackExecutor} = rewiremock.proxy(
        () => require('../../../src/pm/corepack'),
        {
          execa: execaMock,
        },
      ));
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('method', function () {
      let executor: _CorepackExecutor;

      beforeEach(function () {
        executor = new CorepackExecutor('npm');
      });

      describe('exec()', function () {
        describe('when "verbose" ExecOpts option is true', function () {
          beforeEach(async function () {
            await executor.exec([], {}, {verbose: true});
          });
          it('should pipe to STDOUT', async function () {
            expect(stdout.pipe, 'was called once');
          });
          it('should pipe to STDERR', async function () {
            expect(stderr.pipe, 'was called once');
          });

          it('should run corepack', function () {
            expect(execaMock.node, 'was called once').and(
              'to have a call satisfying',
              /corepack/,
            );
          });
        });

        describe('when "verbose" ExecOpts option is not true', function () {
          beforeEach(async function () {
            await executor.exec([], {}, {verbose: false});
          });
          it('should not pipe to STDOUT', async function () {
            expect(stdout.pipe, 'was not called');
          });
          it('should not pipe to STDERR', async function () {
            expect(stderr.pipe, 'was not called');
          });

          it('should run corepack', function () {
            expect(execaMock.node, 'was called once').and(
              'to have a call satisfying',
              /corepack/,
            );
          });
        });
      });
    });
  });
});
