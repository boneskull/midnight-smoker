import {ErrorCode} from 'midnight-smoker/error';
import {PackEvents} from 'midnight-smoker/event';
import {type SmokeMachinePkgPackOkEvent} from 'midnight-smoker/machine';
import {
  PackError,
  type PkgManagerContext,
  toResult,
} from 'midnight-smoker/pkg-manager';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, createActor, fromPromise} from 'xstate';
import {runUntilDone, runUntilEmitted, runUntilSpawn} from 'xstate-audition';

import {PackMachine, type PackMachineInput} from '../../src/pack-machine';
import {createDebug} from '../debug';
import {
  nullPkgManager,
  nullPkgManagerSpec,
  testPkgManagerContext,
  testPlugin,
  testWorkspaces,
  workspaceInstallManifest,
} from './fixture';

const debug = createDebug(__filename);

const expect = unexpected.clone().use(unexpectedSinon);

describe('pack', () => {
  describe('PackMachine', () => {
    /**
     * Actor ID of the test pack machine
     */
    const id = 'test-pack-machine';

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
    const pkgPackOkEvent: SmokeMachinePkgPackOkEvent = {
      installManifest: toResult(workspaceInstallManifest),
      pkgManager: spec,
      sender: id,
      type: PackEvents.PkgPackOk,
    };

    let sandbox: sinon.SinonSandbox;
    let input: PackMachineInput;
    let logic: typeof PackMachine;
    let packLogicStub: sinon.SinonStub;
    let ctx: PkgManagerContext;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      ctx = {...testPkgManagerContext};
      input = {ctx, envelope};
      packLogicStub = sandbox.stub().resolves(workspaceInstallManifest);
      logic = PackMachine.provide({
        actors: {
          pack: fromPromise(packLogicStub),
        },
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('event', () => {
      describe('PACK', () => {
        let actor: Actor<typeof logic>;

        beforeEach(() => {
          actor = createActor(logic, {
            id,
            input,
            logger,
          });
        });

        it(`should emit "${PackEvents.PkgPackBegin}"`, async () => {
          const promise = runUntilEmitted(actor, [PackEvents.PkgPackBegin]);
          actor.send({
            sender: 'test',
            type: 'PACK',
            workspaces: [...testWorkspaces],
          });

          const [result] = await promise;
          expect(result.type, 'to be', PackEvents.PkgPackBegin);
        });

        it('should spawn the "pack" actor', async () => {
          const promise = runUntilSpawn(actor, /^pack\./);
          actor.send({
            sender: 'test',
            type: 'PACK',
            workspaces: [...testWorkspaces],
          });
          await promise;
          expect(packLogicStub, 'was called once');
        });

        describe('when packing completes successfully', () => {
          let actor: Actor<typeof logic>;

          beforeEach(() => {
            actor = createActor(logic, {
              id,
              input,
              logger,
            });
          });

          it(`should emit ${PackEvents.PkgPackOk}`, async () => {
            const promise = runUntilEmitted(actor, [PackEvents.PkgPackOk]);
            actor.send({
              sender: 'test',
              type: 'PACK',
              workspaces: [...testWorkspaces],
            });

            await expect(promise, 'to be fulfilled with value satisfying', [
              pkgPackOkEvent,
            ]);
          });

          it('should kill the pack actor', async () => {
            const promise = runUntilEmitted(actor, [PackEvents.PkgPackOk]);
            actor.send({
              sender: 'test',
              type: 'PACK',
              workspaces: [...testWorkspaces],
            });
            await promise;
            expect(actor.getSnapshot().context.packActorRefs, 'to be empty');
          });
        });

        describe('when packing fails', () => {
          let actor: Actor<typeof logic>;

          beforeEach(() => {
            packLogicStub = sandbox
              .stub()
              .rejects(
                new PackError(
                  'test error',
                  spec,
                  {} as any,
                  '/tmp',
                  new Error('test error'),
                ),
              );
            logic = PackMachine.provide({
              actors: {
                pack: fromPromise(packLogicStub),
              },
            });

            actor = createActor(logic, {
              id,
              input,
              logger,
            });
          });

          it(`should emit "${PackEvents.PkgPackFailed}"`, async () => {
            const promise = runUntilEmitted(actor, [PackEvents.PkgPackFailed]);
            actor.send({
              sender: 'test',
              type: 'PACK',
              workspaces: [...testWorkspaces],
            });

            const result = await promise;
            expect(result, 'to satisfy', [
              {
                error: {
                  code: ErrorCode.PackError,
                },
                type: PackEvents.PkgPackFailed,
              },
            ]);
          });

          it('should kill the pack actor', async () => {
            const promise = runUntilEmitted(actor, [PackEvents.PkgPackFailed]);
            actor.send({
              sender: 'test',
              type: 'PACK',
              workspaces: [...testWorkspaces],
            });
            await promise;
            expect(actor.getSnapshot().context.packActorRefs, 'to be empty');
          });
        });
      });

      describe('ABORT', () => {
        let actor: Actor<typeof logic>;
        let destroyAllChildrenStub: sinon.SinonStub;

        beforeEach(() => {
          destroyAllChildrenStub = sandbox.stub();
          logic = logic.provide({
            actions: {
              destroyAllChildren: destroyAllChildrenStub,
            },
          });
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

        it('should destroy all children', async () => {
          const promise = runUntilDone(actor);
          actor.send({
            reason: 'test reason',
            type: 'ABORT',
          });

          await promise;
          expect(destroyAllChildrenStub, 'was called once');
        });

        it('should stop itself', async () => {
          const promise = runUntilDone(actor);
          sandbox.spy(actor, 'stop');
          actor.send({
            reason: 'test reason',
            type: 'ABORT',
          });

          await promise;
          expect(actor.stop, 'was called once');
        });

        it('should have "stopped" status', async () => {
          const promise = runUntilDone(actor);
          sandbox.spy(actor, 'stop');
          actor.send({
            reason: 'test reason',
            type: 'ABORT',
          });

          await promise;
          expect(actor.getSnapshot().status, 'to be', 'stopped');
        });
      });
    });
  });
});
