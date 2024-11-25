import {PluginMetadata} from 'midnight-smoker';
import {type ExecOutput, type Executor} from 'midnight-smoker/defs/executor';
import {type PkgManagerPackContext} from 'midnight-smoker/defs/pkg-manager';
import {AbortError, PackError} from 'midnight-smoker/error';
import {PkgManagerSpec} from 'midnight-smoker/pkg-manager';
import {WorkspaceInstallManifestSchema} from 'midnight-smoker/schema';
import {R} from 'midnight-smoker/util';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {packLogic} from '../../src/pack-logic';

const expect = unexpected.clone().use(unexpectedSinon);

describe('packLogic', () => {
  const nullExecutor: Executor = async (): Promise<ExecOutput> => {
    const result: ExecOutput = {
      command: '',
      cwd: '',
      exitCode: 0,
      stderr: '',
      stdout: '',
    };
    return result;
  };
  let sandbox: sinon.SinonSandbox;
  let ctx: PkgManagerPackContext;
  let pkgManager: any;
  let spec: any;
  let signal: AbortSignal;
  let abortController: AbortController;
  beforeEach(() => {
    abortController = new AbortController();
    sandbox = sinon.createSandbox();
    signal = abortController.signal;
    ctx = {
      executor: nullExecutor,
      localPath: '/path/to/package',
      pkgJson: {name: 'test-package', version: '1.0.0'},
      pkgJsonPath: '/path/to/package/package.json',
      pkgJsonSource: '{"name": "test-package", "version": "1.0.0"}',
      pkgName: 'test-package',
      signal,
      spec: new PkgManagerSpec({
        name: 'nullpm',
        requestedAs: `nullpm@1.0.0`,
        version: '1.0.0',
      }),
      tmpdir: '/tmp',
      workspaceInfo: [
        {
          localPath: '/path/to/package',
          pkgJson: {name: 'test-package', version: '1.0.0'},
          pkgJsonPath: '/path/to/package/package.json',
          pkgJsonSource: '{"name": "test-package", "version": "1.0.0"}',
          pkgName: 'test-package',
        },
      ],
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('when actor is stopped', () => {
    it('should abort', async () => {
      const actor = createActor(packLogic, {
        input: {
          ctx: R.omit(ctx, ['signal']),
          envelope: {
            id: 'nullpm',
            pkgManager,
            plugin: PluginMetadata.createTransient('test-plugin'),
            spec,
          },
        },
      });
      const promise = runUntilDone(actor);

      actor.stop();

      await expect(
        promise,
        'to be rejected with',
        new AbortError('Test abort'),
      );
    });
  });

  describe('when packing succeeds', () => {
    it('should return a valid WorkspaceInstallManifest', async () => {
      const manifest = {name: 'test-package', version: '1.0.0'};
      pkgManager.pack.resolves(manifest);

      const actor = createActor(packLogic, {
        input: {
          ctx,
          envelope: {
            id: 'nullpm',
            pkgManager,
            plugin: PluginMetadata.createTransient('test-plugin'),
            spec,
          },
        },
      });

      const result = await runUntilDone(actor);

      expect(
        result,
        'to satisfy',
        WorkspaceInstallManifestSchema.parse({
          ...ctx.workspaceInfo,
          ...manifest,
        }),
      );
    });
  });

  describe('when packing fails with a known error', () => {
    it('should throw the known error', async () => {
      const error = new PackError('Known error', spec, ctx, ctx.tmpdir);
      pkgManager.pack.rejects(error);

      const actor = createActor(packLogic, {
        input: {
          ctx,
          envelope: {
            id: 'nullpm',
            pkgManager,
            plugin: PluginMetadata.createTransient('test-plugin'),
            spec,
          },
        },
      });

      await expect(runUntilDone(actor), 'to be rejected with', error);
    });
  });

  describe('when packing fails with an unknown error', () => {
    it('should throw a PackError', async () => {
      const error = new Error('Unknown error');
      pkgManager.pack.rejects(error);

      const actor = createActor(packLogic, {
        input: {
          ctx,
          envelope: {
            id: 'nullpm',
            pkgManager,
            plugin: PluginMetadata.createTransient('test-plugin'),
            spec,
          },
        },
      });

      await expect(
        runUntilDone(actor),
        'to be rejected with',
        new PackError(
          `Failed to pack package "${ctx.pkgName}" for unknown reason; see \`cause\` property for details`,
          spec,
          ctx,
          ctx.tmpdir,
          error,
        ),
      );
    });
  });
});
