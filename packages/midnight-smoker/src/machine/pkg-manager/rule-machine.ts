import {FAILED, FINAL, OK} from '#constants';
import {RuleContext} from '#rule/rule-context';
import {type CheckResultOk} from '#schema/check-result';
import {type LintManifest} from '#schema/lint-manifest';
import {type SomeRuleConfig} from '#schema/rule-options';
import {type StaticRuleContext} from '#schema/rule-static';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {uniqueId} from '#util/unique-id';
import {serialize} from '#util/util';
import {isEmpty, isNumber} from 'lodash';
import {
  and,
  assign,
  enqueueActions,
  fromPromise,
  not,
  setup,
  type ActorRefFrom,
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
  parentRef?: AnyActorRef;
  plan?: number;
}

export interface RuleMachineContext extends RuleMachineInput {
  results: CheckOutput[];
  checkRefs?: Record<string, ActorRefFrom<typeof check>>;
}

export interface RuleMachineCheckEvent {
  type: 'CHECK';
  ctx: StaticRuleContext;
  manifest: LintManifest;
}

export interface RuleMachineCheckActorDoneEvent {
  type: 'xstate.done.actor.check.*';
  output: CheckOutput;
}

export interface RuleMachineCheckResultEvent {
  output: CheckOutput;
  config: SomeRuleConfig;
  type: 'CHECK_RESULT';
}

export type RuleMachineEvents =
  | RuleMachineCheckEvent
  | RuleMachineCheckActorDoneEvent
  | RuleMachineCheckResultEvent;

/**
 * Runs a single rule's check against an installed package using user-provided
 * configuration
 */
export const check = fromPromise<CheckOutput, CheckInput>(
  async ({self, input}) => {
    const {ctx: staticCtx, opts, def, ruleId} = input;

    const ctx = RuleContext.create(def, staticCtx, ruleId);

    try {
      await def.check(ctx, opts);
    } catch (err) {
      ctx.addIssueFromError(err);
    }
    const issues = ctx.finalize() ?? [];
    if (isEmpty(issues)) {
      const ok: CheckResultOk = {type: OK, ctx, rule: serialize(def)};
      return {...input, result: ok, type: OK, actorId: self.id};
    }
    return {
      ...input,
      // TODO fix this readonly disagreement.  it _should_ be read-only, but that breaks somewhere down the line
      result: [...issues],
      actorId: self.id,
      ctx,
      type: FAILED,
    };
  },
);

export type RuleMachineOutput = CheckOutput[];

export const RuleMachine = setup({
  types: {
    context: {} as RuleMachineContext,
    input: {} as RuleMachineInput,
    events: {} as RuleMachineEvents,
    output: {} as RuleMachineOutput,
  },
  guards: {
    isChecking: ({context: {checkRefs}}) => !isEmpty(checkRefs),
    shouldHalt: ({context: {results = [], plan}}) => {
      return isNumber(plan) && results.length >= plan;
    },
  },
  actions: {
    enqueueCheck: assign({
      checkRefs: (
        {
          spawn,
          context: {
            def,
            config: {opts},
            checkRefs = {},
            ruleId,
          },
        },
        {ctx, manifest}: {ctx: StaticRuleContext; manifest: LintManifest},
      ) => {
        const id = uniqueId({prefix: 'check', postfix: ruleId});
        const actor = spawn('check', {
          id,
          input: {def, ruleId, opts, ctx, manifest},
        });
        return {
          ...checkRefs,
          [id]: actor,
        };
      },
    }),
    report: enqueueActions(({enqueue, context}, output: CheckOutput) => {
      const {parentRef, config} = context;
      const evt: PkgManagerMachineCheckResultEvent = {
        type: 'CHECK_RESULT',
        output,
        config,
      };
      if (parentRef) {
        enqueue.sendTo(parentRef, evt);
      }
      enqueue.emit(evt as RuleMachineCheckResultEvent);
    }),
    stopCheckActor: enqueueActions(
      ({enqueue, context: {checkRefs = {}}}, actorId: string) => {
        const actor = checkRefs[actorId];
        if (actor) {
          enqueue.stopChild(actor);
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[actorId]: _, ...rest} = checkRefs;
        enqueue.assign({checkRefs: rest});
      },
    ),
    appendCheckResult: assign({
      results: ({context: {results}}, output: CheckOutput) => [
        ...results,
        output,
      ],
    }),
  },
  actors: {
    check,
  },
}).createMachine({
  id: 'RuleMachine',
  context: ({input}) => ({...input, results: []}),
  initial: 'ready',
  states: {
    ready: {
      always: [
        {
          guard: and([not('isChecking'), 'shouldHalt']),
          target: 'done',
        },
      ],
      on: {
        'xstate.done.actor.check.*': {
          actions: [
            {
              type: 'report',
              params: ({event: {output}}) => output,
            },
            {
              type: 'appendCheckResult',
              params: ({event: {output}}) => output,
            },
            {
              type: 'stopCheckActor',
              params: ({
                event: {
                  output: {actorId},
                },
              }) => actorId,
            },
          ],
        },
        CHECK: {
          actions: [
            {
              type: 'enqueueCheck',
              params: ({event}) => event,
            },
          ],
        },
      },
    },
    done: {type: FINAL},
  },
  output: ({context: {results}}) => results,
});
