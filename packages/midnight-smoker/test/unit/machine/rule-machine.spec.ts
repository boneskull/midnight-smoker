import {OK, RuleSeverities} from '#constants';
import {ErrorCodes} from '#error/codes';
import {
  type PkgManagerMachineCheckErrorEvent,
  type PkgManagerMachineCheckResultEvent,
} from '#machine/pkg-manager-machine';
import {RuleMachine, type RuleMachineInput} from '#machine/rule-machine';
import {PluginRegistry} from '#plugin/plugin-registry';
import {type LintManifest} from '#schema/lint-manifest';
import {type SomeRuleConfig} from '#schema/rule-options';
import {type StaticRuleContext} from '#schema/rule-static';
import {FileManager} from '#util/filemanager';
import Debug from 'debug';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {scheduler} from 'node:timers/promises';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {
  createActor,
  setup,
  toPromise,
  type ActorRef,
  type Snapshot,
} from 'xstate';
import {nullRule} from '../mocks/component';
import {createActorRunner} from './actor-helpers';

const debug = Debug('midnight-smoker:test:loader-machine');
const expect = unexpected.clone();

const {start, waitForActor, runUntilDone, runUntilSnapshot, runUntilEvent} =
  createActorRunner(RuleMachine, {
    logger: debug,
  });

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('RuleMachine', function () {
      let pluginRegistry: PluginRegistry;
      let fileManager: FileManager;
      let vol: Volume;
      let sandbox: sinon.SinonSandbox;
      let ruleId: string;
      let config: SomeRuleConfig;
      let parentRef: ActorRef<
        Snapshot<unknown>,
        PkgManagerMachineCheckResultEvent | PkgManagerMachineCheckErrorEvent
      >;
      const plan = 1;
      let input: RuleMachineInput;
      beforeEach(async function () {
        sandbox = createSandbox();
        ({vol} = memfs());
        fileManager = new FileManager({fs: vol as any});
        pluginRegistry = PluginRegistry.create({fileManager});
        await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.defineRule(nullRule);
          },
        });
        ruleId = pluginRegistry.getComponentId(nullRule);
        config = {
          severity: RuleSeverities.Error,
          opts: {},
        };
        parentRef = createActor(
          setup({
            types: {
              events: {} as
                | PkgManagerMachineCheckResultEvent
                | PkgManagerMachineCheckErrorEvent,
            },
          }).createMachine({}),
        );
        input = {
          def: nullRule,
          ruleId,
          config,
          parentRef,
          plan,
        };
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('when plan is equal to the count of completed checks', function () {
        it('should exit', async function () {
          await expect(
            runUntilDone({...input, plan: 0}),
            'to be fulfilled with value satisfying',
            {results: expect.it('to be empty').and('to be an array')},
          );
        });
      });

      describe('when plan is omitted', function () {
        it('should wait for events', async function () {
          await expect(
            runUntilSnapshot((snapshot) => snapshot.status === 'stopped', {
              ...input,
              plan: undefined,
            }),
            'to be rejected',
          );
        });
      });

      describe('when it receives a CHECK event', function () {
        it('should emit a CHECK_RESULT event', async function () {
          const actor = runUntilEvent(['CHECK_RESULT'], input);
          actor.send({
            type: 'CHECK',
            ctx: {} as StaticRuleContext,
            manifest: {} as LintManifest,
          });
          await expect(actor, 'to be fulfilled with value satisfying', [
            {
              type: 'CHECK_RESULT',
              output: {
                config: {},
                manifest: {},
                ruleId,
                actorId: expect.it('to be a string'),
                type: OK,
              },
            },
          ]);
        });

        describe('when it receives an ABORT event', function () {
          it('should abort running check actors', async function () {
            sandbox.stub(nullRule, 'check').callsFake(async (_, __, signal) => {
              await scheduler.wait(500, {signal});
            });
            const actor = start(input);

            const p = waitForActor(/^check\./, actor);
            actor.send({
              type: 'CHECK',
              ctx: {} as StaticRuleContext,
              manifest: {} as LintManifest,
            });
            const actorRef = await p;
            actor.send({type: 'ABORT'});
            expect(actorRef.getSnapshot().status, 'to be', 'stopped');
            await expect(
              toPromise(actor),
              'to be fulfilled with value satisfying',
              {
                aborted: true,
              },
            );
          });
        });

        describe('when the rule throws', function () {
          beforeEach(function () {
            sandbox.stub(nullRule, 'check').throws(new Error('test error'));
          });

          it('should emit a CHECK_ERROR event', async function () {
            const actor = runUntilEvent(['CHECK_ERROR'], input);
            actor.send({
              type: 'CHECK',
              ctx: {} as StaticRuleContext,
              manifest: {} as LintManifest,
            });
            await expect(actor, 'to be fulfilled with value satisfying', [
              {
                type: 'CHECK_ERROR',
                output: {
                  error: {
                    code: ErrorCodes.RuleError,
                  },
                },
              },
            ]);
          });

          it('should output with a MachineError', async function () {
            const actor = runUntilDone(input);
            actor.send({
              type: 'CHECK',
              ctx: {} as StaticRuleContext,
              manifest: {} as LintManifest,
            });
            await expect(actor, 'to be fulfilled with value satisfying', {
              results: expect.it('to be empty').and('to be an array'),
              error: {
                code: ErrorCodes.MachineError,
                errors: [{code: ErrorCodes.RuleError}],
              },
            });
          });
        });

        it('should output an array of the results', async function () {
          const actor = runUntilDone(input);
          actor.send({
            type: 'CHECK',
            ctx: {} as StaticRuleContext,
            manifest: {} as LintManifest,
          });
          await expect(actor, 'to be fulfilled with value satisfying', {
            results: [
              {
                config: {},
                manifest: {},
                ruleId,
                actorId: expect.it('to be a string'),
                type: OK,
              },
            ],
          });
        });
      });
    });
  });
});
