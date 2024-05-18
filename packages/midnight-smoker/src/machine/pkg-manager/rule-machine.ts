import {FAILED, makeId, OK} from '#machine/util';
import {RuleContext} from '#rule/context';
import {
  type LintManifest,
  type RuleResultOk,
  type SomeRuleConfig,
  type SomeRuleDef,
  type StaticRuleContext,
} from '#schema';
import {serialize} from '#util/util';
import {isEmpty} from 'lodash';
import {
  enqueueActions,
  fromPromise,
  sendTo,
  setup,
  type AnyActorRef,
} from 'xstate';
import {
  type CheckInput,
  type CheckOutput,
  type PkgManagerMachineCheckResultEvent,
} from './pkg-manager-machine-events';

export interface RuleMachineInput {
  def: SomeRuleDef;
  ruleId: string;
  config: SomeRuleConfig;
  parentRef: AnyActorRef;
}

export interface RuleMachineContext extends RuleMachineInput {}

export interface RuleMachineCheckEvent {
  type: 'CHECK';
  ctx: StaticRuleContext;
  manifest: LintManifest;
}

export interface RuleMachineCheckDoneEvent {
  type: 'xstate.done.actor.check.*';
  output: CheckOutput;
}

export type RuleMachineEvents =
  | RuleMachineCheckEvent
  | RuleMachineCheckDoneEvent;

/**
 * Runs a single rule's check against an installed package using user-provided
 * configuration
 */
export const check = fromPromise<CheckOutput, CheckInput>(async ({input}) => {
  const {ctx: staticCtx, opts, def, ruleId} = input;

  const ctx = RuleContext.create(def, staticCtx, ruleId);

  try {
    await def.check(ctx, opts);
  } catch (err) {
    ctx.addIssueFromError(err);
  }
  const issues = ctx.finalize() ?? [];
  if (isEmpty(issues)) {
    const ok: RuleResultOk = {type: OK, ctx, rule: serialize(def)};
    return {...input, result: ok, type: OK};
  }
  return {
    ...input,
    // TODO fix this readonly disagreement.  it _should_ be read-only, but that breaks somewhere down the line
    result: [...issues],
    ctx,
    type: FAILED,
  };
});

export const RuleMachine = setup({
  types: {
    context: {} as RuleMachineContext,
    input: {} as RuleMachineInput,
    events: {} as RuleMachineEvents,
  },
  guards: {},
  actions: {},
  actors: {
    check,
  },
}).createMachine({
  context: ({input}) => input,
  initial: 'idle',
  on: {
    'xstate.done.actor.check.*': {
      actions: [
        sendTo(
          ({context: {parentRef}}) => parentRef,
          ({context, event}): PkgManagerMachineCheckResultEvent => {
            const {output} = event;
            const {config} = context;
            return {type: 'CHECK_RESULT', output, config};
          },
        ),
      ],
    },
    CHECK: {
      actions: [
        enqueueActions(
          ({
            enqueue,
            context: {
              ruleId,
              def,
              config: {opts},
            },
            event: {ctx, manifest},
          }) => {
            const id = `check.${makeId()}-${ruleId}`;
            const input: CheckInput = {def, ruleId, opts, ctx, manifest};
            enqueue.spawnChild('check', {id, input});
          },
        ),
      ],
    },
  },
});
