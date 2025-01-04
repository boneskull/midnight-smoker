import {InstallEvents} from 'midnight-smoker/constants';
import {ErrorCode} from 'midnight-smoker/error';
import {type PkgInstallOkMachineEvent} from 'midnight-smoker/machine';
import {
  ExecError,
  type ExecOutput,
  InstallError,
  toResult,
} from 'midnight-smoker/pkg-manager';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, createActor, fromPromise} from 'xstate';
import {runUntilDone, runUntilEmitted, runUntilSpawn} from 'xstate-audition';

import {
  InstallMachine,
  type InstallMachineInput,
} from '../../src/install/install-machine';
import {createDebug} from '../debug';
import {
  nullPkgManager,
  nullPkgManagerSpec,
  testPkgManagerContext,
  testPlugin,
  workspaceInstallManifest,
} from './fixture';

const debug = createDebug(__filename);

const expect = unexpected.clone().use(unexpectedSinon);

describe('install', () => {
  describe('InstallMachine', () => {
    /**
     * Actor ID of the test install machine
     */
    const id = 'test-install-machine';

    /**
     * Silent logger
     */
    const logger = debug;
    const spec = nullPkgManagerSpec.clone();
    const pkgManager = {...nullPkgManager};
    const plugin = {...testPlugin};
    const envelope: PkgManagerEnvelope = {
      id: pkgManager.name,
      pkgManager,
      plugin,
      spec,
    };
    const rawResult: ExecOutput = {
      stderr: '',
      stdout: '',
    };
    const pkgInstallOkEvent: PkgInstallOkMachineEvent = {
      installManifest: toResult(workspaceInstallManifest),
      pkgManager: spec,
      rawResult,
      sender: id,
      type: InstallEvents.PkgInstallOk,
    };
    const ctx = {...testPkgManagerContext};
    const installManifest = {...workspaceInstallManifest};
    const execError = new ExecError('test error', rawResult);

    let sandbox: sinon.SinonSandbox;
    let input: InstallMachineInput;
    let logic: typeof InstallMachine;
    let installLogicStub: sinon.SinonStub;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      input = {ctx, envelope};
      installLogicStub = sandbox.stub().resolves({
        installManifest,
        rawResult,
      });
      logic = InstallMachine.provide({
        actors: {
          install: fromPromise(installLogicStub),
        },
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('event', () => {
      describe('INSTALL', () => {
        let actor: Actor<typeof logic>;

        beforeEach(() => {
          actor = createActor(logic, {
            id,
            input,
            logger,
          });
        });

        it(`should emit "${InstallEvents.PkgInstallBegin}"`, async () => {
          const promise = runUntilEmitted(actor, [
            InstallEvents.PkgInstallBegin,
          ]);
          actor.send({
            manifests: [workspaceInstallManifest],
            sender: 'test',
            type: 'INSTALL',
          });

          const [result] = await promise;
          expect(result.type, 'to be', InstallEvents.PkgInstallBegin);
        });

        it('should spawn the "install" actor', async () => {
          const promise = runUntilSpawn(actor, /^install\./);
          actor.send({
            manifests: [workspaceInstallManifest],
            sender: 'test',
            type: 'INSTALL',
          });
          await promise;
          expect(installLogicStub, 'was called once');
        });

        describe('when installation completes successfully', () => {
          let actor: Actor<typeof logic>;

          beforeEach(() => {
            actor = createActor(logic, {
              id,
              input,
              logger,
            });
          });

          it(`should emit ${InstallEvents.PkgInstallOk}`, async () => {
            const promise = runUntilEmitted(actor, [
              InstallEvents.PkgInstallOk,
            ]);
            actor.send({
              manifests: [workspaceInstallManifest],
              sender: 'test',
              type: 'INSTALL',
            });

            await expect(promise, 'to be fulfilled with value satisfying', [
              pkgInstallOkEvent,
            ]);
          });

          it('should kill the install actor', async () => {
            const promise = runUntilEmitted(actor, [
              InstallEvents.PkgInstallOk,
            ]);
            actor.send({
              manifests: [workspaceInstallManifest],
              sender: 'test',
              type: 'INSTALL',
            });
            await promise;
            expect(
              actor.getSnapshot().context.installActorRef,
              'to be undefined',
            );
          });
        });

        describe('when installation fails', () => {
          let actor: Actor<typeof logic>;

          beforeEach(() => {
            installLogicStub = sandbox
              .stub()
              .rejects(new InstallError(execError, installManifest, spec));
            logic = InstallMachine.provide({
              actors: {
                install: fromPromise(installLogicStub),
              },
            });

            actor = createActor(logic, {
              id,
              input,
              logger,
            });
          });

          it(`should emit "${InstallEvents.PkgInstallFailed}"`, async () => {
            const promise = runUntilEmitted(actor, [
              InstallEvents.PkgInstallFailed,
            ]);
            actor.send({
              manifests: [workspaceInstallManifest],
              sender: 'test',
              type: 'INSTALL',
            });

            const result = await promise;
            expect(result, 'to satisfy', [
              {
                error: {
                  code: ErrorCode.InstallError,
                },
                type: InstallEvents.PkgInstallFailed,
              },
            ]);
          });

          it('should kill the install actor', async () => {
            const promise = runUntilEmitted(actor, [
              InstallEvents.PkgInstallFailed,
            ]);
            actor.send({
              manifests: [workspaceInstallManifest],
              sender: 'test',
              type: 'INSTALL',
            });
            await promise;
            expect(
              actor.getSnapshot().context.installActorRef,
              'to be undefined',
            );
          });
        });
      });

      describe('ABORT', () => {
        let actor: Actor<typeof logic>;

        beforeEach(() => {
          actor = createActor(logic, {
            id,
            input,
            logger,
          });
        });

        it('should set aborted to true', async () => {
          const promise = runUntilDone(actor);
          actor.send({
            reason: 'test reason',
            type: 'ABORT',
          });

          await promise;
          expect(actor.getSnapshot().context.aborted, 'to be true');
        });
      });
    });
  });
});
