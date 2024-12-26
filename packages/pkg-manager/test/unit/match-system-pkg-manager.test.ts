import type which from 'which';

import {memfs} from 'memfs';
import {DEFAULT_PKG_MANAGER_NAME, FileManager, SYSTEM} from 'midnight-smoker';
import {
  type PkgManager,
  type StaticPkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import {PluginMetadata, PluginRegistry} from 'midnight-smoker/plugin';
import {type ExecFn} from 'midnight-smoker/schema';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {
  matchSystemPkgManagerLogic,
  type MatchSystemPkgManagerLogicInput,
} from '../../src/match-system-pkg-manager';
import {createDebug} from '../debug';
import {nullPkgManager, nullPkgManagerSpec} from './fixture';

const expect = unexpected.clone().use(unexpectedSinon);

const logger = createDebug(__filename);

describe('pkg-manager', () => {
  describe('matchSystemPkgManagerLogic', () => {
    let sandbox: sinon.SinonSandbox;
    let plugins: Readonly<PluginMetadata>[];
    let spec: StaticPkgManagerSpec;
    let execStub: sinon.SinonStubbedMember<ExecFn>;
    let whichStub: sinon.SinonStubbedMember<typeof which>;
    let actor: Actor<typeof matchSystemPkgManagerLogic>;
    let input: MatchSystemPkgManagerLogicInput;
    let registry: PluginRegistry;
    let plugin: Readonly<PluginMetadata>;
    let fileManager: FileManager;
    let pkgManager: PkgManager;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();
      plugin = PluginMetadata.createTransient('test-plugin');
      spec = nullPkgManagerSpec.clone();

      execStub = sandbox.stub().resolves({
        command: '',
        cwd: '/some/path',
        exitCode: 0,
        stderr: '',
        stdout: '1.0.0',
      }) as sinon.SinonStubbedMember<ExecFn>;
      whichStub = sandbox
        .stub<Parameters<typeof which>, Promise<string>>()
        .resolves('/path/to/nullpm');
      const {fs} = memfs();
      fileManager = FileManager.create({fs: fs as any});
      registry = PluginRegistry.create({fileManager});
      plugins = [plugin];
      pkgManager = {...nullPkgManager};
      // componentRegistry = new Map([[pkgManager, ]]);
      await registry.registerPlugin(plugin, {
        plugin(api) {
          api.definePackageManager(pkgManager);
        },
      });
      input = {
        componentRegistry: registry.componentRegistry,
        exec: execStub as ExecFn,
        plugins,
        spec,
        which: whichStub,
      };

      actor = createActor(matchSystemPkgManagerLogic, {
        input,
        logger,
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('when a system pkg manager is found', () => {
      beforeEach(async () => {
        const defaultPlugin = PluginMetadata.createTransient(
          `${DEFAULT_PKG_MANAGER_NAME}-plugin`,
        );
        await registry.registerPlugin(defaultPlugin, {
          plugin(api) {
            api.definePackageManager({
              ...pkgManager,
              bin: DEFAULT_PKG_MANAGER_NAME,
              name: DEFAULT_PKG_MANAGER_NAME,
            });
          },
        });
        spec = {
          label: `${DEFAULT_PKG_MANAGER_NAME}@${SYSTEM}`,
          name: DEFAULT_PKG_MANAGER_NAME,
          version: SYSTEM,
        };
        plugins = [plugin, defaultPlugin];
        whichStub.resolves(`/path/to/${DEFAULT_PKG_MANAGER_NAME}`);
      });
      it('should resolve with a non-empty MatchSystemPkgManagerLogicOutput', async () => {
        await expect(
          runUntilDone(actor),
          'to be fulfilled with value satisfying',
          {
            defaultSystemPkgManagerEnvelope: expect.it('to be an object'),
            envelope: expect.it('to be an object'),
          },
        );
      });

      describe('when the default system pkg manager is requested', () => {
        it('should resolve with the default package manager', async () => {
          actor = createActor(matchSystemPkgManagerLogic, {
            input: {...input, plugins, spec},
            logger,
          });
          await expect(
            runUntilDone(actor),
            'to be fulfilled with value satisfying',
            {
              envelope: {
                id: `${DEFAULT_PKG_MANAGER_NAME}-plugin/${DEFAULT_PKG_MANAGER_NAME}`,
                spec: {
                  bin: `/path/to/${DEFAULT_PKG_MANAGER_NAME}`,
                  name: DEFAULT_PKG_MANAGER_NAME,
                },
              },
            },
          );
        });

        it('should set the default package manager to the _default_ default package manager', async () => {
          actor = createActor(matchSystemPkgManagerLogic, {
            input: {...input, plugins, spec},
            logger,
          });
          await expect(
            runUntilDone(actor),
            'to be fulfilled with value satisfying',
            {
              defaultSystemPkgManagerEnvelope: {
                id: 'npm-plugin/npm',
                spec: {
                  bin: '/path/to/npm',
                  name: DEFAULT_PKG_MANAGER_NAME,
                },
              },
            },
          );
        });
      });
    });

    describe('when system package manager is found', () => {});

    describe('when system package manager is not found', () => {
      beforeEach(() => {
        whichStub.resolves(undefined);
      });

      it('should return an empty object', async () => {
        const result = await runUntilDone(actor);
        expect(result, 'to equal', {});
      });
    });

    describe('when system package manager version is not accepted', () => {
      beforeEach(() => {
        execStub.resolves({
          command: '',
          cwd: '',
          exitCode: 0,
          stderr: '',
          stdout: '0.0.1',
        });
      });

      it('should return an empty object', async () => {
        await expect(
          runUntilDone(actor),
          'to be fulfilled with value satisfying',
          expect.it('to be an object').and('to be empty'),
        );
      });
    });

    describe('when system package manager version is accepted', () => {
      it('should return a valid PkgManagerEnvelope', async () => {
        const result = await runUntilDone(actor);
        expect(result.envelope, 'to satisfy', {
          spec: expect.it('to be an', Object),
        });
      });
    });

    describe('when exec fails', () => {
      beforeEach(() => {
        execStub.rejects(new Error('exec failed'));
      });

      it('should return an empty object', async () => {
        const result = await runUntilDone(actor);
        expect(result, 'to equal', {});
      });
    });

    describe('when multiple package managers are found', () => {
      beforeEach(async () => {
        const npmPkgManager = {
          ...nullPkgManager,
          bin: 'npm',
          name: DEFAULT_PKG_MANAGER_NAME,
        };
        registry.clear();
        await registry.registerPlugin(plugin, {
          plugin(api) {
            api.definePackageManager(pkgManager);
            api.definePackageManager(npmPkgManager);
          },
        });
        plugins = [plugin];
        input = {
          ...input,
          componentRegistry: registry.componentRegistry,
          plugins,
        };
      });

      it('should prefer the _default_ default package manager', async () => {
        actor = createActor(matchSystemPkgManagerLogic, {
          input,
          logger,
        });
        let result = await runUntilDone(actor);
        expect(
          result.defaultSystemPkgManagerEnvelope?.spec.name,
          'to be',
          'nullpm',
        );
        actor = createActor(matchSystemPkgManagerLogic, {
          input: {
            ...input,
            defaultSystemPkgManagerEnvelope:
              result.defaultSystemPkgManagerEnvelope,
            spec: {label: 'npm@1.0.0', name: 'npm', version: '1.0.0'},
          },
          logger,
        });
        result = await runUntilDone(actor);
        expect(
          result.defaultSystemPkgManagerEnvelope?.spec.name,
          'to be',
          'npm',
        );
      });

      it('should return the first found package manager if no default is specified', async () => {
        input.plugins = plugins;
        actor = createActor(matchSystemPkgManagerLogic, {input});

        const result = await runUntilDone(actor);
        expect(result.envelope?.spec.name, 'to be', 'nullpm');
      });
    });

    describe('when no package managers are found', () => {
      it('should return an empty object', async () => {
        actor = createActor(matchSystemPkgManagerLogic, {
          input: {...input, plugins: []},
          logger,
        });

        const result = await runUntilDone(actor);
        expect(result, 'to equal', {});
      });
    });
  });
});
