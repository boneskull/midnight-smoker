import {OK} from '#constants';
import {ControlMachine, type CtrlMachineInput} from '#machine/control';
import {type SmokerOptions} from '#options/options';
import {OptionsParser} from '#options/options-parser';
import {PluginRegistry} from '#plugin/plugin-registry';
import {FileManager} from '#util/filemanager';
import Debug from 'debug';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {
  nullExecutor,
  nullPkgManagerDef,
  nullReporter,
  nullRule,
} from '../../mocks/component';
import {createActorRunner} from '../actor-helpers';
// const debug = Debug('midnight-smoker:test:machine:control-machine');
const expect = unexpected.clone().use(unexpectedSinon);

const {start, run} = createActorRunner(ControlMachine, {
  logger: Debug('midnight-smoker:actor:ControlMachine'),
  id: 'ControlMachine',
});

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('ControlMachine', function () {
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      let smokerOptions: SmokerOptions;
      let sandbox: sinon.SinonSandbox;

      beforeEach(async function () {
        ({vol} = memfs());
        fileManager = FileManager.create({fs: vol as any});
        pluginRegistry = PluginRegistry.create({fileManager});
        sandbox = createSandbox();
        await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.definePackageManager(nullPkgManagerDef);
            api.defineRule(nullRule);
            api.defineReporter(nullReporter);
          },
        });
        smokerOptions = OptionsParser.buildSmokerOptionsSchema(
          pluginRegistry,
        ).parse({
          reporter: 'test-plugin/test-reporter',
          pkgManager: 'nullpm@1.0.0',
          cwd: '/',
        });
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('external event handling', function () {
        let input: CtrlMachineInput;

        beforeEach(function () {
          input = {
            defaultExecutor: nullExecutor,
            fileManager,
            pluginRegistry,
            shouldShutdown: true,
            smokerOptions,
            systemExecutor: nullExecutor,
          };
          const midnightSmokerPath = path.posix.resolve(
            __dirname,
            '..',
            '..',
            '..',
          );
          vol.fromJSON({
            // test package.json
            '/package.json': JSON.stringify({
              name: 'test-workspace',
              version: '1.0.0',
            }),

            // we need this when we read the package.json of midnight-smoker.
            [`${midnightSmokerPath}/package.json`]: JSON.stringify({
              name: 'midnight-smoker',
              version: '1.0.0',
            }),
          });
        });

        describe('when no operations requested', function () {
          it('should short-circuit and resolve with the "noop" flag', async function () {
            await expect(
              run({
                ...input,
                smokerOptions: {...input.smokerOptions, lint: false},
              }),
              'to be fulfilled with value satisfying',
              {
                type: OK,
                noop: true,
              },
            );
          });
        });

        describe('when the ABORT event is received', function () {
          it('should shutdown and output with the aborted flag', async function () {
            const actor = start(input);
            actor.send({type: 'ABORT', reason: 'butts'});
            await expect(run(actor), 'to be fulfilled with value satisfying', {
              aborted: true,
            });
          });
        });

        describe('default behavior', function () {
          it('should lint and return output with the LintResults', async function () {
            await expect(run(input), 'to be fulfilled with value satisfying', {
              type: OK,
              lint: [
                {
                  pkgName: 'test-workspace',
                  type: 'OK',
                },
              ],
              id: 'ControlMachine',
            });
          });
        });
      });
    });
  });
});
