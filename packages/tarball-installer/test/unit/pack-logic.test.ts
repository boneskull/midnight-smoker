import {
  type PkgManager,
  type PkgManagerPackContext,
} from 'midnight-smoker/defs/pkg-manager';
import {ErrorCode, PackError} from 'midnight-smoker/error';
import {type PkgManagerSpec} from 'midnight-smoker/pkg-manager';
import {R} from 'midnight-smoker/util';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {packLogic, type PackLogicInput} from '../../src/pack-logic';
import {
  makePkgManagerPackContext,
  nullExecutor,
  nullPkgManager,
  nullPkgManagerSpec,
  testPlugin,
  workspaceInstallManifest,
} from './fixture';

const expect = unexpected.clone().use(unexpectedSinon);

describe('packLogic', () => {
  let sandbox: sinon.SinonSandbox;
  let ctx: PkgManagerPackContext;
  let pkgManager: PkgManager;
  let spec: PkgManagerSpec;
  let signal: AbortSignal;
  let abortController: AbortController;
  let input: PackLogicInput;
  beforeEach(() => {
    abortController = new AbortController();
    pkgManager = {...nullPkgManager};
    sandbox = sinon.createSandbox();
    signal = abortController.signal;
    spec = nullPkgManagerSpec.clone();
    ctx = makePkgManagerPackContext(spec, nullExecutor, signal);
    input = {
      ctx: R.omit(ctx, ['signal']),
      envelope: {
        id: 'nullpm',
        pkgManager,
        plugin: testPlugin,
        spec,
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('when actor is stopped', () => {
    it('should return undefined', async () => {
      const actor = createActor(packLogic, {
        input,
      });
      const promise = runUntilDone(actor);

      actor.stop();

      await expect(promise, 'to be fulfilled with', undefined);
    });
  });

  describe('when packing succeeds', () => {
    it('should return a valid WorkspaceInstallManifest', async () => {
      sandbox.stub(pkgManager, 'pack').resolves(workspaceInstallManifest);

      const actor = createActor(packLogic, {
        input,
      });

      const result = await runUntilDone(actor);

      expect(result, 'to satisfy', workspaceInstallManifest);
    });
  });

  describe('when packing fails with SomePackError', () => {
    it('should reject with the same error', async () => {
      const error = new PackError('Known error', spec, ctx, ctx.tmpdir);
      sandbox.stub(pkgManager, 'pack').rejects(error);

      const actor = createActor(packLogic, {
        input,
      });

      await expect(runUntilDone(actor), 'to be rejected with', error);
    });
  });

  describe('when packing fails with an unknown error', () => {
    it('should throw a PackError', async () => {
      const error = new Error('Unknown error');
      sandbox.stub(pkgManager, 'pack').rejects(error);

      const actor = createActor(packLogic, {
        input,
      });

      await expect(
        runUntilDone(actor),
        'to be rejected with error satisfying',
        {
          cause: error,
          code: ErrorCode.PackError,
          context: {
            originalMessage: `Failed to pack package "${ctx.pkgName}" for unknown reason; see \`cause\` property for details`,
          },
          message: `${spec.label} failed to pack package "${ctx.pkgName}"`,
        },
      );
    });
  });
});
