import type {ExecaMock} from '@midnight-smoker/test-util';
import {createExecaMock} from '@midnight-smoker/test-util';
import {type ExecaError} from 'execa';
import * as Executor from 'midnight-smoker/executor';
import {PkgManagerSpec} from 'midnight-smoker/pkg-manager';
import {Readable} from 'node:stream';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('@midnight-smoker/plugin-default', function () {
  describe('corepackExecutor', function () {
    const MOCK_PM_SPEC = 'nullpm@1.0.0';

    let corepackExecutor: Executor.Executor;
    let sandbox: sinon.SinonSandbox;
    let stdout: sinon.SinonStubbedInstance<Readable>;
    let stderr: sinon.SinonStubbedInstance<Readable>;
    let execaMock: ExecaMock;

    beforeEach(function () {
      sandbox = createSandbox();
      stdout = sandbox.createStubInstance(Readable);
      stderr = sandbox.createStubInstance(Readable);
      execaMock = createExecaMock({stdout, stderr});
      ({corepackExecutor} = rewiremock.proxy(
        () => require('../../src/corepack-executor'),
        {
          execa: execaMock,
        },
      ));
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('when "verbose" ExecOpts option is true', function () {
      beforeEach(async function () {
        await corepackExecutor(
          PkgManagerSpec.create({
            bin: 'nullpm',
            version: '1.0.0',
          }).toJSON(),
          ['foo'],
          {verbose: true},
        );
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
        await corepackExecutor(
          PkgManagerSpec.create({
            bin: 'nullpm',
            version: '1.0.0',
          }).toJSON(),
          ['foo'],
          {verbose: false},
        );
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

    describe('when execution fails', function () {
      let err: ExecaError;

      beforeEach(async function () {
        err = Object.assign(new Error('foo'), {
          isCanceled: false,
          message: '',
          shortMessage: '',
          name: '',
          command: '',
          exitCode: 0,
          signal: '',
          stdout: '',
          stderr: '',
          escapedCommand: '',
          all: '',
          failed: false,
          timedOut: false,
          killed: false,
          originalMessage: '',
        });
        execaMock.node.rejects(err);
      });

      it('should throw an ExecError', async function () {
        await expect(
          corepackExecutor(
            PkgManagerSpec.create({
              bin: 'nullpm',
              version: '1.0.0',
            }).toJSON(),
            ['foo'],
          ),
          'to be rejected with error satisfying',
          expect.it('to be a', Executor.ExecError),
        );
      });
    });
  });
});
