import {OK, RuleSeverities} from '#constants';
import {ErrorCode} from '#error/codes';
import {
  type CheckErrorEvent,
  type CheckResultEvent,
} from '#machine/event/check';
import {RuleMachine, type RuleMachineInput} from '#machine/rule-machine';
import {PluginRegistry} from '#plugin/registry';
import {type LintManifest} from '#rule/lint-manifest';
import {type StaticRuleContext} from '#rule/static-rule-context';
import {type SomeRule} from '#schema/rule';
import {type SomeRuleConfig} from '#schema/rule-options';
import {FileManager} from '#util/filemanager';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {scheduler} from 'node:timers/promises';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {
  type Actor,
  type ActorRef,
  createActor,
  setup,
  type Snapshot,
} from 'xstate';
import {
  runUntilDone,
  runUntilEmitted,
  runUntilSnapshot,
  waitForSpawn,
} from 'xstate-audition';

import {createDebug} from '../../debug';
import {nullRule} from '../mocks/component';

const expect = unexpected.clone();
const logger = createDebug(__filename);

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
        CheckErrorEvent | CheckResultEvent
      >;
      const plan = 1;
      let input: RuleMachineInput;
      let rule: SomeRule;
      let actor: Actor<typeof RuleMachine>;

      beforeEach(async function () {
        sandbox = createSandbox();
        ({vol} = memfs());
        fileManager = new FileManager({fs: vol as any});
        rule = {...nullRule};
        pluginRegistry = PluginRegistry.create({
          fileManager,
        });
        const plugin = await pluginRegistry.registerPlugin('test-plugin', {
          plugin(api) {
            api.defineRule(rule);
          },
        });
        ruleId = pluginRegistry.getComponentId(rule);
        config = {
          opts: {},
          severity: RuleSeverities.Error,
        };
        parentRef = createActor(
          setup({
            types: {
              events: {} as CheckErrorEvent | CheckResultEvent,
            },
          }).createMachine({}),
        );
        input = {
          envelope: {
            config,
            id: ruleId,
            plugin,
            rule,
          },
          parentRef,
          plan,
        };
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('when plan is equal to the count of completed checks', function () {
        it('should exit', async function () {
          actor = createActor(RuleMachine, {
            input: {...input, plan: 0},
            logger,
          });
          await expect(
            runUntilDone(actor),
            'to be fulfilled with value satisfying',
            {results: expect.it('to be empty').and('to be an array')},
          );
        });
      });

      describe('when plan is omitted', function () {
        it('should wait for events', async function () {
          actor = createActor(RuleMachine, {
            input: {
              ...input,
              plan: undefined,
            },
            logger,
          });
          await expect(
            runUntilSnapshot(
              actor,
              (snapshot) => snapshot.status === 'stopped',
            ),
            'to be rejected',
          );
        });
      });

      describe('when it receives a CHECK event', function () {
        beforeEach(function () {
          actor = createActor(RuleMachine, {input, logger});
        });

        it('should emit a CHECK_RESULT event', async function () {
          const promise = runUntilEmitted(actor, ['CHECK_RESULT']);
          actor.send({
            ctx: {} as StaticRuleContext,
            manifest: {} as LintManifest,
            type: 'CHECK',
          });
          await expect(promise, 'to be fulfilled with value satisfying', [
            {
              output: {
                actorId: expect.it('to be a string'),
                config: {},
                manifest: {},
                ruleId,
                type: OK,
              },
              type: 'CHECK_RESULT',
            },
          ]);
        });

        describe('when it receives an ABORT event', function () {
          it('should abort running lint actors', async function () {
            sandbox.stub(rule, 'check').callsFake(async (_, __, signal) => {
              await scheduler.wait(500, {signal});
            });
            const actor = createActor(RuleMachine, {input, logger});

            const spawnPromise = waitForSpawn(actor, /^lint\./);
            actor.send({
              ctx: {} as StaticRuleContext,
              manifest: {} as LintManifest,
              type: 'CHECK',
            });
            const actorRef = await spawnPromise;
            const donePromise = runUntilDone(actor);
            actor.send({type: 'ABORT'});
            expect(actorRef.getSnapshot().status, 'to be', 'stopped');
            await expect(donePromise, 'to be fulfilled with value satisfying', {
              aborted: true,
            });
          });
        });

        describe('when the rule throws', function () {
          beforeEach(function () {
            sandbox.stub(rule, 'check').throws(new Error('test error'));
          });

          it('should emit a CHECK_ERROR event', async function () {
            const promise = runUntilEmitted(actor, ['CHECK_ERROR']);
            actor.send({
              ctx: {} as StaticRuleContext,
              manifest: {} as LintManifest,
              type: 'CHECK',
            });
            await expect(promise, 'to be fulfilled with value satisfying', [
              {
                output: {
                  error: {
                    code: ErrorCode.RuleError,
                  },
                },
                type: 'CHECK_ERROR',
              },
            ]);
          });

          it('should output with a MachineError', async function () {
            const promise = runUntilDone(actor);
            actor.send({
              ctx: {} as StaticRuleContext,
              manifest: {} as LintManifest,
              type: 'CHECK',
            });
            await expect(promise, 'to be fulfilled with value satisfying', {
              error: {
                code: ErrorCode.MachineError,
                errors: [{code: ErrorCode.RuleError}],
              },
              results: expect.it('to be an array'),
            });
          });
        });

        it('should output an array of the results', async function () {
          const promise = runUntilDone(actor);
          actor.send({
            ctx: {} as StaticRuleContext,
            manifest: {} as LintManifest,
            type: 'CHECK',
          });
          await expect(promise, 'to be fulfilled with value satisfying', {
            results: [
              {
                actorId: expect.it('to be a string'),
                config: {},
                manifest: {},
                ruleId,
                type: OK,
              },
            ],
          });
        });
      });
    });
  });
});
