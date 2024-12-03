import {memfs} from 'memfs';
import {
  type PkgManagerContext,
  type StaticPkgManagerSpec,
} from 'midnight-smoker/defs/pkg-manager';
import {FileManager, R} from 'midnight-smoker/util';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {
  createPkgManagerContextLogic,
  type CreatePkgManagerContextLogicInput,
  destroyPkgManagerContextLogic,
  type DestroyPkgManagerContextLogicInput,
} from '../../src/pkg-manager-context';
import {createDebug} from '../debug';
import {
  nullExecutor,
  nullPkgManagerSpec,
  testPkgManagerContext,
} from './fixture';

const expect = unexpected.clone().use(unexpectedSinon);

const logger = createDebug(__filename);

describe('pkg-manager', () => {
  describe('createPkgManagerContextLogic', () => {
    let sandbox: sinon.SinonSandbox;
    let fileManager: FileManager;
    let input: CreatePkgManagerContextLogicInput;
    let spec: StaticPkgManagerSpec;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const {fs} = memfs();
      fileManager = FileManager.create({fs: fs as any});
      spec = nullPkgManagerSpec.clone();
      input = {
        executor: nullExecutor,
        fileManager,
        linger: false,
        options: {
          loose: false,
          verbose: false,
        },
        spec,
        useWorkspaces: false,
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should create a valid PkgManagerContext', async () => {
      const actor = createActor(createPkgManagerContextLogic, {input, logger});
      await expect(
        runUntilDone(actor),
        'to be fulfilled with value satisfying',
        {
          ...R.omit(input, ['options']),
          loose: input.options!.loose,
          tmpdir: expect.it('to be a string'),
          verbose: input.options!.verbose,
        },
      );
    });
  });

  describe('destroyPkgManagerContextLogic', () => {
    let sandbox: sinon.SinonSandbox;
    let fileManager: FileManager;
    let input: DestroyPkgManagerContextLogicInput;
    let pkgManagerContext: Readonly<PkgManagerContext>;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const {fs} = memfs();
      fileManager = FileManager.create({fs: fs as any});
      sandbox.stub(fileManager, 'pruneTempDir').resolves();
      pkgManagerContext = {...testPkgManagerContext};
      input = {
        ctx: pkgManagerContext,
        fileManager,
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('when "linger" flag is false', () => {
      it('should prune the temporary directory', async () => {
        const actor = createActor(destroyPkgManagerContextLogic, {
          input,
          logger,
        });
        await runUntilDone(actor);
        expect(fileManager.pruneTempDir, 'to have a call satisfying', [
          pkgManagerContext.tmpdir,
          expect.it('to be an', AbortSignal),
        ]);
      });
    });

    describe('when "linger" flag is true', () => {
      it('should not prune the temporary directory', async () => {
        const actor = createActor(destroyPkgManagerContextLogic, {
          input: {...input, ctx: {...input.ctx, linger: true}},
          logger,
        });
        await runUntilDone(actor);

        expect(fileManager.pruneTempDir, 'was not called');
      });
    });
  });
});
