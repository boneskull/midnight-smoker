import {ErrorCode, PackEvents, type PkgManagerEnvelope} from 'midnight-smoker';
import {type SmokeMachinePkgPackOkEvent} from 'midnight-smoker/machine';
import {
  asResult,
  PackError,
  type PkgManagerPackContext,
  PkgManagerSpec,
  type WorkspaceInstallManifest,
} from 'midnight-smoker/pkg-manager';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, createActor, fromPromise} from 'xstate';
import {runUntilEmitted, runUntilSpawn} from 'xstate-audition';

import {PackMachine, type PackMachineInput} from '../../src/pack-machine';

const expect = unexpected.clone().use(unexpectedSinon);

describe('PackMachine', () => {
  let sandbox: sinon.SinonSandbox;
  let input: PackMachineInput;
  let logic: typeof PackMachine;
  let packStub: sinon.SinonStub;
  const spec = new PkgManagerSpec({
    name: 'nullpm',
    requestedAs: `nullpm@1.0.0`,
    version: '1.0.0',
  });
  const installManifest: WorkspaceInstallManifest = {
    cwd: '/some/cwd',
    installPath: '/some/tmp/path',
    isAdditional: false,
    localPath: '/some/other/path',
    pkgJson: {name: 'test-package', version: '1.0.0'},
    pkgJsonPath: '/path/to/package.json',
    pkgJsonSource: "{name: 'test-package', version: '1.0.0'}",
    pkgName: 'test-package',
    pkgSpec: 'nullpm@1.0.0',
  };

  const pkgPackOkEvent: SmokeMachinePkgPackOkEvent = {
    installManifest: asResult(installManifest),
    pkgManager: spec,
    sender: 'test-sender',
    type: PackEvents.PkgPackOk,
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    input = {envelope: {spec} as PkgManagerEnvelope};
    packStub = sandbox.stub().resolves(installManifest);
    logic = PackMachine.provide({
      actors: {
        pack: fromPromise(packStub),
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
          input,
        });
      });

      it.only(`should emit "${PackEvents.PkgPackBegin}"`, async () => {
        const promise = runUntilEmitted(actor, [PackEvents.PkgPackBegin]);
        actor.send({
          contexts: [{pkgName: 'test-package'} as any],
          sender: 'test',
          type: 'PACK',
        });

        const [result] = await promise;
        expect(result.type, 'to be', PackEvents.PkgPackBegin);
      });

      it('should spawn the "pack" actor', async () => {
        const promise = runUntilSpawn(actor, /^pack\./);
        const ctx: PkgManagerPackContext = {pkgName: 'test-package'} as any;
        actor.send({
          contexts: [ctx],
          sender: 'test',
          type: 'PACK',
        });
        await promise;
        expect(packStub, 'was called once');
      });

      describe('when packing completes successfully', () => {
        let actor: Actor<typeof logic>;

        beforeEach(() => {
          actor = createActor(logic, {
            id: 'test-sender',
            input,
          });
        });

        it(`should emit ${PackEvents.PkgPackOk}`, async () => {
          const promise = runUntilEmitted(actor, [PackEvents.PkgPackOk]);
          const ctx: PkgManagerPackContext = {pkgName: 'test-package'} as any;
          actor.send({
            contexts: [ctx],
            sender: 'test',
            type: 'PACK',
          });

          await expect(promise, 'to be fulfilled with value satisfying', [
            pkgPackOkEvent,
          ]);
        });

        it('should kill the pack actor', async () => {
          const promise = runUntilEmitted(actor, [PackEvents.PkgPackOk]);
          const ctx: PkgManagerPackContext = {pkgName: 'test-package'} as any;
          actor.send({
            contexts: [ctx],
            sender: 'test',
            type: 'PACK',
          });
          await promise;
          expect(actor.getSnapshot().context.packActorRefs, 'to be empty');
        });
      });

      describe('when packing fails', () => {
        let actor: Actor<typeof logic>;

        beforeEach(() => {
          packStub = sandbox
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
              pack: fromPromise(packStub),
            },
          });

          actor = createActor(logic, {
            input,
          });
        });

        it(`should emit "${PackEvents.PkgPackFailed}"`, async () => {
          const promise = runUntilEmitted(actor, [PackEvents.PkgPackFailed]);
          const ctx: PkgManagerPackContext = {pkgName: 'test-package'} as any;
          actor.send({
            contexts: [ctx],
            sender: 'test',
            type: 'PACK',
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
          const ctx: PkgManagerPackContext = {pkgName: 'test-package'} as any;
          actor.send({
            contexts: [ctx],
            sender: 'test',
            type: 'PACK',
          });
          await promise;
          expect(actor.getSnapshot().context.packActorRefs, 'to be empty');
        });
      });
    });
  });
});
