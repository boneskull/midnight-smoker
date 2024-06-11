import {OK, RuleSeverities} from '#constants';
import {ErrorCodes} from '#error/codes';
import {type LintManifest} from '#schema/lint-manifest';
import {type SomeRuleConfig} from '#schema/rule-options';
import {type StaticRuleContext} from '#schema/rule-static';
import Debug from 'debug';
import {memfs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {
  createActor,
  setup,
  toPromise,
  type ActorRef,
  type Snapshot,
} from 'xstate';
import {
  type PkgManagerMachineCheckErrorEvent,
  type PkgManagerMachineCheckResultEvent,
} from '../../../../src/machine/pkg-manager/pkg-manager-machine-events';
import {
  RuleMachine,
  type RuleMachineInput,
} from '../../../../src/machine/pkg-manager/rule-machine';
import {PluginRegistry} from '../../../../src/plugin/plugin-registry';
import {FileManager} from '../../../../src/util/filemanager';
import {nullRule} from '../../mocks/component';
import {createActorRunner} from '../actor-helpers';

const debug = Debug('midnight-smoker:test:loader-machine');
const expect = unexpected.clone();

const {start, run, runUntilSnapshot, runUntilEvent} = createActorRunner(
  RuleMachine,
  {
    logger: debug,
  },
);

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
      let signal: AbortSignal;
      const plan = 1;
      let input: RuleMachineInput;
      let ac: AbortController;
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
        ac = new AbortController();
        signal = ac.signal;
        input = {
          def: nullRule,
          ruleId,
          config,
          parentRef,
          signal,
          plan,
        };
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('when plan is equal to the count of completed checks', function () {
        it('should exit', async function () {
          await expect(
            run({...input, plan: 0}),
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
                opts: {},
                manifest: {},
                ruleId,
                actorId: expect.it('to be a string'),
                type: OK,
              },
            },
          ]);
        });

        describe('when the signal is aborted', function () {
          it('should abort', async function () {
            const actor = start(input);

            ac.abort();
            actor.send({
              type: 'CHECK',
              ctx: {} as StaticRuleContext,
              manifest: {} as LintManifest,
            });

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
                error: {
                  code: ErrorCodes.RuleError,
                },
              },
            ]);
          });

          it('should output with a MachineError', async function () {
            const actor = run(input);
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
          const actor = run(input);
          actor.send({
            type: 'CHECK',
            ctx: {} as StaticRuleContext,
            manifest: {} as LintManifest,
          });
          await expect(actor, 'to be fulfilled with value satisfying', {
            results: [
              {
                opts: {},
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
