import {ERROR, OK} from '#constants';
import {ErrorCode} from '#error/codes';
import {
  resolvePluginLogic,
  type ResolvePluginLogicInput,
} from '#machine/actor/resolve-plugin';
import {FileManager} from '#util/filemanager';
import {uniqueId} from '#util/unique-id';
import {type ImportableVolume, impvol} from 'impvol';
import {createFsFromVolume} from 'memfs';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('actor', function () {
      describe('resolve-plugin', function () {
        const PLUGIN_NAME = 'test-plugin';
        let actor: Actor<typeof resolvePluginLogic>;
        let sandbox: sinon.SinonSandbox;
        let input: ResolvePluginLogicInput;
        let fileManager: FileManager;

        /**
         * Unique ID to build dir name
         */
        let id = 0;

        /**
         * Dir name: `test-plugin-${id}`
         */
        let dir: string;
        let vol: ImportableVolume;

        before(function () {
          vol = impvol();

          fileManager = FileManager.create({
            fs: createFsFromVolume(vol as any) as any,
          });
        });

        // it appears that either a) there's module caching happening, or b)
        // impvol isn't quick enough to write repeatedly using fromJSON.
        // to that end, each test gets its own directory _for now_
        beforeEach(async function () {
          dir = `test-plugin-${id++}`;

          vol.fromJSON({
            [`/${dir}/index.mjs`]: `export default {name: 'test-plugin', plugin: () => {}, description: 'stuff'}`,
            [`/${dir}/package.json`]: JSON.stringify({
              exports: {
                '.': './index.mjs',
              },
              name: PLUGIN_NAME,
              type: 'module',
              version: '1.0.0',
            }),
          });
          sandbox = createSandbox();
          input = {
            cwd: '/',
            fileManager,
            id: uniqueId(),
            loader: {
              // while impvol will do the importing, we still need to
              // simulate the resolver.
              // TODO: try import.meta.resolve someday
              resolve: sandbox.stub().returns(`/${dir}/index.mjs`),
            },
            moduleId: 'test-plugin',
          };
        });

        afterEach(function () {
          sandbox.restore();
          vol.reset();
        });

        describe('when resolution fails with an error code other than "MODULE_NOT_FOUND"', function () {
          it('should resolve with type "error" and a PluginResolutionError', async function () {
            const err = Object.assign(new Error('yuk yuk'), {code: 'EYUKYUK'});
            actor = createActor(resolvePluginLogic, {
              input: {
                ...input,
                loader: {
                  resolve: sandbox.stub().throws(err),
                },
              },
            });

            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  cause: err,
                  code: ErrorCode.PluginResolutionError,
                },
                type: ERROR,
              },
            );
          });
        });

        describe('when resolution throws some other error without a "code"', function () {
          it('should resolve with type "error" and a PluginResolutionError', async function () {
            const err = new Error('yuk yuk');
            actor = createActor(resolvePluginLogic, {
              input: {
                ...input,
                loader: {
                  resolve: sandbox.stub().throws(err),
                },
              },
            });

            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  cause: err,
                  code: ErrorCode.PluginResolutionError,
                },
                type: ERROR,
              },
            );
          });
        });

        describe('when resolution throws with code "MODULE_NOT_FOUND"', function () {
          it('should resolve with type "error" and an UnresolvablePluginError', async function () {
            const err = Object.assign(new Error('cannot find it'), {
              code: 'MODULE_NOT_FOUND',
            });
            actor = createActor(resolvePluginLogic, {
              input: {
                ...input,
                loader: {
                  resolve: sandbox.stub().throws(err),
                },
              },
            });

            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  code: ErrorCode.UnresolvablePluginError,
                },
                type: ERROR,
              },
            );
          });
        });

        describe('when a plugin contains a syntax error', function () {
          it('should resolve with type "error" and a PluginImportError', async function () {
            vol.fromJSON({
              [`/${dir}/index.mjs`]: 'export default {',
            });
            actor = createActor(resolvePluginLogic, {
              input: {
                ...input,
                loader: {
                  resolve: sandbox.stub().returns(`/${dir}/index.mjs`),
                },
              },
            });

            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  code: ErrorCode.PluginImportError,
                },
                type: ERROR,
              },
            );
          });
        });

        describe('when a plugin has an unreadable package.json', function () {
          beforeEach(function () {
            vol.fromJSON({
              [`/${dir}/package.json`]: 'invalid',
            });

            actor = createActor(resolvePluginLogic, {input});
          });

          it('should resolve with type "error" and a PluginManifestError', async function () {
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  code: ErrorCode.PluginManifestError,
                },
                type: ERROR,
              },
            );
          });
        });

        describe('when resolving via module ID', function () {
          beforeEach(function () {
            actor = createActor(resolvePluginLogic, {
              input,
            });
          });

          it('should resolve a plugin with type "ok"', async function () {
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                metadata: {
                  id: PLUGIN_NAME,
                },
                plugin: {
                  description: 'stuff',
                  name: PLUGIN_NAME,
                },
                type: OK,
              },
            );
          });
        });
      });
    });
  });
});
