import {ERROR, OK} from '#constants';
import {ErrorCode} from '#error/codes';
import {
  registerPluginLogic,
  type RegisterPluginLogicInput,
} from '#machine/actor/register-plugin';
import {type ComponentRegistry} from '#plugin/component';
import {PluginMetadata} from '#plugin/plugin-metadata';
import {type PkgManager} from '#schema/pkg-manager';
import {type Plugin} from '#schema/plugin';
import {uniqueId} from '#util/unique-id';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {nullPkgManager} from '../../mocks/component';
import {createPlugin} from '../../mocks/plugin';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('actor', function () {
      describe('register-plugin', function () {
        const PLUGIN_NAME = 'register-plugin-test-plugin';
        let componentRegistry: ComponentRegistry;
        let plugin: Plugin;
        let metadata: PluginMetadata;
        let pkgManager: PkgManager;
        let sandbox: sinon.SinonSandbox;
        let input: RegisterPluginLogicInput;
        let actor: Actor<typeof registerPluginLogic>;

        beforeEach(async function () {
          componentRegistry = new WeakMap();
          sandbox = createSandbox();
          pkgManager = {...nullPkgManager};
          plugin = createPlugin({
            name: PLUGIN_NAME,
            pkgManager,
          });
          metadata = PluginMetadata.createTransient(PLUGIN_NAME);
          input = {
            componentRegistry,
            id: uniqueId(),
            metadata,
            plugin,
          };
          actor = createActor(registerPluginLogic, {input});
        });

        afterEach(function () {
          sandbox.restore();
        });

        it('should register a plugin successfully', async function () {
          await expect(
            runUntilDone(actor),
            'to be fulfilled with value satisfying',
            {
              metadata: {
                id: PLUGIN_NAME,
              },
              plugin,
              type: OK,
            },
          );
        });

        describe('when the plugin is already registered', function () {
          beforeEach(async function () {
            const {newComponents} = await runUntilDone(actor);

            // in practice, it's the registry's responsibility to update the
            // component registry.
            for (const [componentObject, component] of newComponents) {
              componentRegistry.set(componentObject, component);
            }
            // I guess you can't run the same actor twice
            actor = createActor(registerPluginLogic, {input});
          });

          it('should throw PluginInitError > ComponentCollisionError', async function () {
            await expect(
              runUntilDone(actor),
              'to be fulfilled with value satisfying',
              {
                error: {
                  cause: {
                    code: ErrorCode.ComponentCollisionError,
                  },
                  code: ErrorCode.PluginInitError,
                },
                type: ERROR,
              },
            );
          });
        });
      });
    });
  });
});
