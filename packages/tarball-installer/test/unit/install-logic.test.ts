import {type PkgManagerInstallContext} from 'midnight-smoker/defs/pkg-manager';
import {ErrorCode, ExecError} from 'midnight-smoker/error';
import {
  type ExecOutput,
  ExecOutputSchema,
  type InstallResult,
} from 'midnight-smoker/schema';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {installLogic, type InstallLogicInput} from '../../src/install-logic';
import {
  nullPkgManager,
  nullPkgManagerSpec,
  testPkgManagerContext,
  testPlugin,
  workspaceInstallManifest,
} from './fixture';

const expect = unexpected.clone().use(unexpectedSinon);

describe('install', () => {
  describe('installLogic', () => {
    let sandbox: sinon.SinonSandbox;
    let ctx: PkgManagerInstallContext;
    let pkgManager: typeof nullPkgManager;
    let input: InstallLogicInput;

    beforeEach(() => {
      pkgManager = {...nullPkgManager};
      sandbox = sinon.createSandbox();
      ctx = {
        ...testPkgManagerContext,
        installManifest: workspaceInstallManifest,
      };
      input = {
        ctx,
        envelope: {
          id: 'nullpm',
          pkgManager,
          plugin: testPlugin,
          spec: nullPkgManagerSpec.clone(),
        },
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('when actor is stopped', () => {
      it('should return undefined', async () => {
        const actor = createActor(installLogic, {
          input,
        });
        const promise = runUntilDone(actor);

        actor.stop();

        await expect(promise, 'to be fulfilled with', undefined);
      });
    });

    describe('when installation succeeds', () => {
      it('should return a valid InstallResult', async () => {
        const execOutput: ExecOutput = {
          command: '',
          cwd: '',
          exitCode: 0,
          stderr: '',
          stdout: '',
        };
        sandbox.stub(pkgManager, 'install').resolves(execOutput);
        sandbox.stub(ExecOutputSchema, 'parse').returns(execOutput);

        const actor = createActor(installLogic, {
          input,
        });

        const result = await runUntilDone(actor);

        expect(result, 'to satisfy', {
          installManifest: workspaceInstallManifest,
          rawResult: execOutput,
        } as InstallResult);
      });
    });

    describe('when installation fails with an ExecError', () => {
      it('should throw an InstallError', async () => {
        const execOutput: ExecOutput = {
          command: '',
          cwd: '',
          exitCode: 1,
          stderr: '',
          stdout: '',
        };
        const error = new ExecError('foo', execOutput);
        sandbox.stub(pkgManager, 'install').rejects(error);

        const actor = createActor(installLogic, {
          input,
        });

        await expect(
          runUntilDone(actor),
          'to be rejected with error satisfying',
          {
            cause: error,
            code: ErrorCode.InstallError,
            context: {
              installManifest: workspaceInstallManifest,
            },
            message: `${input.envelope.spec.label} failed to install package "${workspaceInstallManifest.pkgSpec}" in dir ${workspaceInstallManifest.cwd}`,
          },
        );
      });
    });

    describe('when installation fails with an unknown error', () => {
      it('should throw an InstallError', async () => {
        const error = new Error('Unknown error');
        sandbox.stub(pkgManager, 'install').rejects(error);

        const actor = createActor(installLogic, {
          input,
        });

        await expect(
          runUntilDone(actor),
          'to be rejected with error satisfying',
          {
            cause: {
              cause: error,
              code: ErrorCode.UnknownError,
              message: 'Unknown error',
            },
            code: ErrorCode.InstallError,
            context: {
              installManifest: workspaceInstallManifest,
            },
            message: `${input.envelope.spec.label} failed to install package "${workspaceInstallManifest.pkgSpec}" in dir ${workspaceInstallManifest.cwd}`,
          },
        );
      });
    });

    describe('when execOutput is invalid', () => {
      it('should throw an InstallError', async () => {
        // @ts-expect-error - bad type
        const execOutput: ExecOutput = {
          command: '',
          cwd: '',
          exitCode: 0,
          // stderr: '',
          stdout: '',
        };
        sandbox.stub(pkgManager, 'install').resolves(execOutput);
        // sandbox.stub(ExecOutputSchema, 'parse').throws(validationError);

        const actor = createActor(installLogic, {
          input,
        });

        await expect(
          runUntilDone(actor),
          'to be rejected with error satisfying',
          {
            cause: {
              code: ErrorCode.ValidationError,
            },
            code: ErrorCode.InstallError,
            context: {
              installManifest: workspaceInstallManifest,
            },
            message: `${input.envelope.spec.label} failed to install package "${workspaceInstallManifest.pkgSpec}" in dir ${workspaceInstallManifest.cwd}`,
          },
        );
      });
    });

    describe('when execOutput.exitCode is non-zero', () => {
      it('should throw an InstallError', async () => {
        const execOutput: ExecOutput = {
          command: '',
          cwd: '',
          exitCode: 1,
          stderr: '',
          stdout: '',
        };
        sandbox.stub(pkgManager, 'install').resolves(execOutput);
        // sandbox.stub(ExecOutput, 'parse').returns(execOutput);

        const actor = createActor(installLogic, {
          input,
        });

        await expect(
          runUntilDone(actor),
          'to be rejected with error satisfying',
          {
            context: {
              installManifest: workspaceInstallManifest,
            },
            message: `${input.envelope.spec.label} failed to install package "${workspaceInstallManifest.pkgSpec}" in dir ${workspaceInstallManifest.cwd}`,
          },
        );
      });
    });
  });
});
