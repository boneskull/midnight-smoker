import {ERROR, FINAL} from '#constants';
import {MachineError} from '#error/machine-error';
import {RuleError} from '#error/rule-error';
import {
  lintLogic,
  type LintLogicOutput,
} from '#machine/actor/operation/lint-logic';
import {type LintManifest} from '#rule/lint-manifest';
import {type StaticRuleContext} from '#rule/static-rule-context';
import {type SomeRule} from '#schema/rule';
import {type SomeRuleConfig} from '#schema/rule-options';
import {assertSmokerError, fromUnknownError} from '#util/error-util';
import {uniqueId} from '#util/unique-id';
import {isNumber} from 'lodash';
import {
  type ActorRef,
  type ActorRefFrom,
  assign,
  type DoneActorEvent,
  enqueueActions,
  type ErrorActorEvent,
  setup,
  type Snapshot,
} from 'xstate';

import {type RuleEnvelope} from '../plugin/component-envelope';
import {type AbortEvent} from './event/abort';
import {type CheckErrorEvent, type CheckResultEvent} from './event/check';
import {DEFAULT_INIT_ACTION, INIT_ACTION} from './util';

/**
 * Union of events emitted by {@link RuleMachine}
 */
export type RuleMachineEmitted = CheckErrorEvent | CheckResultEvent;

/**
 * Union of events listened to by {@link RuleMachine}
 */
export type RuleMachineEvent =
  | AbortEvent
  | CheckErrorEvent
  | RuleMachineCheckEvent
  | RuleMachineLintActorDoneEvent
  | RuleMachineLintActorErrorEvent;

/**
 * Event emitted when the {@link lintLogic} actor is done
 *
 * @event
 */
export interface RuleMachineLintActorDoneEvent
  extends DoneActorEvent<LintLogicOutput> {
  type: 'xstate.done.actor.lint.*';
}

export interface RuleMachineLintActorErrorEvent extends ErrorActorEvent<Error> {
  type: 'xstate.error.actor.lint.*';
}

/**
 * Event upon which the {@link RuleMachine} will run
 * {@link RuleMachineInput.rule.check}
 */
export interface RuleMachineCheckEvent {
  /**
   * Static rule context.
   *
   * A {@link RuleContext} will be created from this.
   */
  ctx: StaticRuleContext;

  /**
   * The {@link LintManifest} which triggered the run.
   *
   * @remarks
   * This is not consumed directly, but is rather for round-tripping to
   * associate the result with the manifest.
   */
  manifest: LintManifest;
  type: 'CHECK';
}

/**
 * Context for {@link RuleMachine}
 */
export interface RuleMachineContext extends RuleMachineInput {
  aborted?: boolean;
  config: SomeRuleConfig;
  error?: MachineError;
  lintRefs?: Record<string, ActorRefFrom<typeof lintLogic>>;

  results: LintLogicOutput[];

  rule: SomeRule;

  ruleId: string;
}

/**
 * Input for {@link RuleMachine}
 */
export interface RuleMachineInput {
  envelope: RuleEnvelope;

  /**
   * The parent machine reference
   */
  parentRef?: ActorRef<Snapshot<unknown>, CheckErrorEvent | CheckResultEvent>;

  /**
   * The count of calls to {@link RuleMachineInput.rule.check} expected to be
   * run.
   *
   * @remarks
   * Used by test code
   */
  plan?: number;
}

/**
 * Output of {@link RuleMachine}
 */
export interface RuleMachineOutput {
  aborted?: boolean;
  results: LintLogicOutput[];
}

/**
 * A machine which is bound to a {@link Rule} and executes its `check` method for
 * each {@link LintManifest} it receives.
 */
export const RuleMachine = setup({
  actions: {
    aborted: assign({aborted: true}),

    /**
     * Appends the result of a {@link lintLogic} actor to
     * {@link RuleMachineContext.results}
     */
    appendCheckResult: assign({
      results: ({context: {results}}, output: LintLogicOutput) => [
        ...results,
        output,
      ],
    }),

    assignError: assign({
      error: ({context, self}, {error}: {error: unknown}) => {
        const err = fromUnknownError(error);
        if (context.error) {
          return context.error.cloneWith(err);
        }

        return new MachineError(
          `Rule ${context.ruleId} encountered an error`,
          err,
          self.id,
        );
      },
    }),

    [INIT_ACTION]: DEFAULT_INIT_ACTION(),

    /**
     * Creates a new {@link lintLogic} actor
     */
    lint: assign({
      lintRefs: (
        {context: {config, lintRefs = {}, rule, ruleId}, spawn},
        {ctx, manifest}: {ctx: StaticRuleContext; manifest: LintManifest},
      ) => {
        const id = uniqueId({prefix: 'lint', suffix: ruleId});
        const actor = spawn('lint', {
          id,
          input: {config, ctx, manifest, rule, ruleId},
        });
        return {
          ...lintRefs,
          [id]: actor,
        };
      },
    }),

    /**
     * Emits a {@link CheckErrorEvent}.
     *
     * If a {@link RuleMachineContext.parentRef} is present, a
     * {@link CheckErrorEvent} is sent to it.
     *
     * @remarks
     * The two events are structurally identical
     */
    sendCheckError: enqueueActions(
      ({context: {parentRef}, enqueue}, error: RuleError) => {
        const {config, installPath, ruleId, ...manifest} = error.context;
        const evt: CheckErrorEvent = {
          output: {
            config,
            error,
            installPath,
            manifest: {
              ...manifest,
              installPath,
            },
            ruleId,
            type: ERROR,
          },
          type: 'CHECK_ERROR',
        };
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
        enqueue.emit(evt);
      },
    ),

    /**
     * Emits a {@link CheckResultEvent}.
     *
     * If a {@link RuleMachineContext.parentRef} is present, a
     * {@link CheckResultEvent} is sent to it.
     *
     * @remarks
     * The two events are structurally identical
     */
    sendCheckResult: enqueueActions(
      ({context: {parentRef}, enqueue}, output: LintLogicOutput) => {
        const evt: CheckResultEvent = {
          output,
          type: 'CHECK_RESULT',
        };
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
        enqueue.emit(evt);
      },
    ),

    stopAllLintActors: enqueueActions(({context: {lintRefs = {}}, enqueue}) => {
      for (const actor of Object.values(lintRefs)) {
        enqueue.stopChild(actor);
      }

      enqueue.assign({lintRefs: undefined});
    }),

    /**
     * Stops a {@link lintLogic} actor and removes it from
     * {@link RuleMachineContext.lintRefs}
     */
    stopLintActor: enqueueActions(
      ({context: {lintRefs = {}}, enqueue}, actorId: string) => {
        const actor = lintRefs[actorId];
        if (actor) {
          enqueue.stopChild(actor);
        }

        const {[actorId]: _, ...rest} = lintRefs;
        enqueue.assign({lintRefs: rest});
      },
    ),
  },
  actors: {
    lint: lintLogic,
  },
  guards: {
    /**
     * Returns `true` if all possible checks have been run.
     */
    shouldHalt: ({context: {error, plan, results = []}}) => {
      if (!isNumber(plan)) {
        return false;
      }

      // TODO: I hate this; we probably want to keep an array of "error result"
      // objects instead of digging into the MachineError. it's unlikely that
      // there would be more than 1 error per spawn of the check actor, which
      // makes this "work" for now.
      // ALSO: the LHS here "should never" be greater than plan, but...
      return results.length + (error?.errors.length ?? 0) >= plan;
    },
  },
  types: {
    context: {} as RuleMachineContext,
    emitted: {} as RuleMachineEmitted,
    events: {} as RuleMachineEvent,
    input: {} as RuleMachineInput,
    output: {} as RuleMachineOutput,
  },
}).createMachine({
  context: ({input}) => {
    const {
      envelope: {config, id: ruleId, rule},
    } = input;
    return {
      ...input,
      config,
      results: [],
      rule,
      ruleId,
    };
  },
  description: 'Runs checks for a single rule. Unique to a package manager',
  entry: [INIT_ACTION],
  id: 'RuleMachine',
  initial: 'ready',
  on: {
    ABORT: {
      actions: [{type: 'stopAllLintActors'}],
      target: '.aborted',
    },
  },
  output: ({context: {aborted, error, results}}) => ({aborted, error, results}),
  states: {
    aborted: {entry: [{type: 'aborted'}], type: FINAL},
    done: {type: FINAL},
    errored: {type: FINAL},
    ready: {
      always: {
        guard: {type: 'shouldHalt'},
        target: 'done',
      },
      description:
        'Waits for a CHECK events and runs checks until all possible checks have been run (one per enabled rule).',
      exit: [{type: 'stopAllLintActors'}],
      on: {
        CHECK: {
          actions: {
            params: ({event}) => event,
            type: 'lint',
          },
        },
        'xstate.done.actor.lint.*': {
          actions: [
            {
              params: ({event: {output}}) => output,
              type: 'appendCheckResult',
            },
            {
              params: ({event: {output}}) => output,
              type: 'sendCheckResult',
            },
            {
              params: ({
                event: {
                  output: {actorId},
                },
              }) => actorId,
              type: 'stopLintActor',
            },
          ],
        },
        'xstate.error.actor.lint.*': {
          actions: [
            {
              params: ({event: {error}}) => {
                assertSmokerError(RuleError, error);
                return error;
              },
              type: 'sendCheckError',
            },
            {params: ({event: {error}}) => ({error}), type: 'assignError'},
            {
              params: ({event: {actorId}}) => actorId,
              type: 'stopLintActor',
            },
          ],
        },
      },
    },
  },
});
