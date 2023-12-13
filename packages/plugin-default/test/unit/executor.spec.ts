import {ExecaMock, createExecaMock} from '@midnight-smoker/test-util';
import type {Executor} from 'midnight-smoker/plugin';
import {Readable} from 'node:stream';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('@midnight-smoker/plugin-default', function () {
  describe('smokerExecutor', function () {
    const MOCK_PM_SPEC = 'nullpm@1.0.0';

    let smokerExecutor: Executor.Executor;
    let sandbox: sinon.SinonSandbox;
    let stdout: sinon.SinonStubbedInstance<Readable>;
    let stderr: sinon.SinonStubbedInstance<Readable>;
    let execaMock: ExecaMock;

    beforeEach(function () {
      sandbox = createSandbox();
      stdout = sandbox.createStubInstance(Readable);
      stderr = sandbox.createStubInstance(Readable);
      execaMock = createExecaMock({stdout, stderr});
      ({smokerExecutor} = rewiremock.proxy(
        () => require('../../src/executor'),
        {
          execa: execaMock,
        },
      ));
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('method', function () {
      describe('exec()', function () {
        describe('when "verbose" ExecOpts option is true', function () {
          beforeEach(async function () {
            await smokerExecutor(MOCK_PM_SPEC, ['foo'], {verbose: true});
          });
          it('should pipe to STDOUT', async function () {
            expect(stdout.pipe, 'was called once');
          });
          it('should pipe to STDERR', async function () {
            expect(stderr.pipe, 'was called once');
          });

          it('should run corepack', function () {
            expect(execaMock.node, 'to have a call satisfying', [
              /corepack$/,
              [MOCK_PM_SPEC, 'foo'],
              {},
            ]).and('was called once');
          });
        });

        describe('when "verbose" ExecOpts option is not true', function () {
          beforeEach(async function () {
            await smokerExecutor(MOCK_PM_SPEC, ['foo'], {verbose: false});
          });
          it('should not pipe to STDOUT', async function () {
            expect(stdout.pipe, 'was not called');
          });
          it('should not pipe to STDERR', async function () {
            expect(stderr.pipe, 'was not called');
          });

          it('should run corepack', function () {
            expect(execaMock.node, 'to have a call satisfying', /corepack/).and(
              'was called once',
            );
          });
        });
      });
    });
  });
});
