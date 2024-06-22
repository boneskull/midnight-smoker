import {FINAL} from '#constants';
import {MachineError} from '#error/machine-error';
import {RuleError} from '#error/rule-error';
import {type LintManifest} from '#schema/lint-manifest';
import {type SomeRuleConfig} from '#schema/rule-options';
import {type StaticRuleContext} from '#schema/rule-static';
import {type SomeRuleDef} from '#schema/some-rule-def';
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
import {
  check,
  type CheckOutputFailed,
  type CheckOutputOk,
} from './actor/operations';
import {type AbortEvent} from './event/abort';
import {
  type PkgManagerMachineCheckErrorEvent,
  type PkgManagerMachineCheckResultEvent,
} from './pkg-manager-machine';

export type CheckOutput = CheckOutputOk | CheckOutputFailed;

export type RuleMachineCheckErrorEvent = PkgManagerMachineCheckErrorEvent;

/**
 * Event emitted when a check is complete.
 *
 * @event
 */
export type RuleMachineCheckResultEvent = PkgManagerMachineCheckResultEvent;

/**
 * Union of events emitted by {@link RuleMachine}
 */
export type RuleMachineEmitted =
  | RuleMachineCheckResultEvent
  | RuleMachineCheckErrorEvent;

/**
 * Union of events listened to by {@link RuleMachine}
 */
export type RuleMachineEvent =
  | RuleMachineCheckEvent
  | RuleMachineCheckErrorEvent
  | RuleMachineCheckActorErrorEvent
  | AbortEvent
  | RuleMachineCheckActorDoneEvent;

/**
 * Event emitted when the {@link check} actor is done
 *
 * @event
 */
export interface RuleMachineCheckActorDoneEvent
  extends DoneActorEvent<CheckOutput> {
  type: 'xstate.done.actor.check.*';
}

export interface RuleMachineCheckActorErrorEvent
  extends ErrorActorEvent<Error> {
  type: 'xstate.error.actor.check.*';
}

/**
 * Event upon which the {@link RuleMachine} will run
 * {@link RuleMachineInput.def.check}
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
  checkRefs?: Record<string, ActorRefFrom<typeof check>>;
  error?: MachineError;
  results: CheckOutput[];
}

/**
 * Input for {@link RuleMachine}
 */
export interface RuleMachineInput {
  /**
   * The user-supplied config for {@link RuleMachineInput.def}
   */
  config: SomeRuleConfig;

  /**
   * The {@link SomeRuleDef RuleDef} to which this machine is bound
   */
  def: SomeRuleDef;

  /**
   * The parent machine reference
   */
  parentRef?: ActorRef<
    Snapshot<unknown>,
    PkgManagerMachineCheckResultEvent | PkgManagerMachineCheckErrorEvent
  >;

  /**
   * The count of calls to {@link RuleMachineInput.def.check} expected to be run.
   *
   * @remarks
   * Used by test code
   */
  plan?: number;

  /**
   * The unique component ID of the {@link RuleMachineInput.def}
   */
  ruleId: string;
}

/**
 * Output of {@link RuleMachine}
 */
export interface RuleMachineOutput {
  aborted?: boolean;
  results: CheckOutput[];
}

/**
 * A machine which is bound to a {@link RuleDef} and executes its `check` method
 * for each {@link LintManifest} it receives.
 */
export const RuleMachine = setup({
  types: {
    context: {} as RuleMachineContext,
    input: {} as RuleMachineInput,
    events: {} as RuleMachineEvent,
    output: {} as RuleMachineOutput,
    emitted: {} as RuleMachineEmitted,
  },
  guards: {
    /**
     * Returns `true` if all possible checks have been run.
     */
    shouldHalt: ({context: {results = [], plan, error}}) => {
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
  actions: {
    assignError: assign({
      error: ({self, context}, {error}: {error: unknown}) => {
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

    /**
     * Creates a new {@link check} actor
     */
    check: assign({
      checkRefs: (
        {spawn, context: {def, config, checkRefs = {}, ruleId}},
        {ctx, manifest}: {ctx: StaticRuleContext; manifest: LintManifest},
      ) => {
        const id = uniqueId({prefix: 'check', postfix: ruleId});
        const actor = spawn('check', {
          id,
          input: {def, ruleId, config, ctx, manifest},
        });
        return {
          ...checkRefs,
          [id]: actor,
        };
      },
    }),

    /**
     * Emits a {@link RuleMachineCheckResultEvent}.
     *
     * If a {@link RuleMachineContext.parentRef} is present, a
     * {@link PkgManagerMachineCheckResultEvent} is sent to it.
     *
     * @remarks
     * The two events are structurally identical
     */
    sendCheckResult: enqueueActions(
      ({enqueue, context: {parentRef}}, output: CheckOutput) => {
        const evt: PkgManagerMachineCheckResultEvent = {
          type: 'CHECK_RESULT',
          output,
        };
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
        enqueue.emit(evt);
      },
    ),

    /**
     * Emits a {@link RuleMachineCheckErrorEvent}.
     *
     * If a {@link RuleMachineContext.parentRef} is present, a
     * {@link PkgManagerMachineCheckErrorEvent} is sent to it.
     *
     * @remarks
     * The two events are structurally identical
     */
    sendCheckError: enqueueActions(
      ({enqueue, context: {parentRef}}, error: RuleError) => {
        const {installPath, config, ruleId, ...manifest} = error.context;
        const evt: PkgManagerMachineCheckErrorEvent = {
          type: 'CHECK_ERROR',
          output: {
            type: 'ERROR',
            installPath,
            config,
            ruleId,
            manifest: {
              ...manifest,
              installPath,
            },
            error,
          },
        };
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
        enqueue.emit(evt);
      },
    ),

    /**
     * Stops a {@link check} actor and removes it from
     * {@link RuleMachineContext.checkRefs}
     */
    stopCheckActor: enqueueActions(
      ({enqueue, context: {checkRefs = {}}}, actorId: string) => {
        const actor = checkRefs[actorId];
        if (actor) {
          enqueue.stopChild(actor);
        }

        const {[actorId]: _, ...rest} = checkRefs;
        enqueue.assign({checkRefs: rest});
      },
    ),

    stopAllCheckActors: enqueueActions(
      ({enqueue, context: {checkRefs = {}}}) => {
        for (const actor of Object.values(checkRefs)) {
          enqueue.stopChild(actor);
        }

        enqueue.assign({checkRefs: undefined});
      },
    ),

    /**
     * Appends the result of a {@link check} actor to
     * {@link RuleMachineContext.results}
     */
    appendCheckResult: assign({
      results: ({context: {results}}, output: CheckOutput) => [
        ...results,
        output,
      ],
    }),

    aborted: assign({aborted: true}),
  },
  actors: {
    check,
  },
}).createMachine({
  id: 'RuleMachine',
  description: 'Runs checks for a single rule. Unique to a package manager',
  context: ({input}) => ({...input, results: []}),
  initial: 'ready',
  states: {
    ready: {
      description:
        'Waits for a CHECK events and runs checks until all possible checks have been run (one per enabled rule).',
      always: {
        guard: {type: 'shouldHalt'},
        target: 'done',
      },
      exit: [{type: 'stopAllCheckActors'}],
      on: {
        ABORT: {
          actions: [{type: 'stopAllCheckActors'}],
          target: 'aborted',
        },
        'xstate.done.actor.check.*': {
          actions: [
            {
              type: 'appendCheckResult',
              params: ({event: {output}}) => output,
            },
            {
              type: 'sendCheckResult',
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
        'xstate.error.actor.check.*': {
          actions: [
            {
              type: 'sendCheckError',
              params: ({event: {error}}) => {
                assertSmokerError(RuleError, error);
                return error;
              },
            },
            {type: 'assignError', params: ({event: {error}}) => ({error})},
            {
              type: 'stopCheckActor',
              params: ({event: {actorId}}) => actorId,
            },
          ],
        },
        CHECK: {
          actions: {
            type: 'check',
            params: ({event}) => event,
          },
        },
      },
    },
    done: {type: FINAL},
    errored: {type: FINAL},
    aborted: {entry: [{type: 'aborted'}], type: FINAL},
  },
  output: ({context: {results, aborted, error}}) => ({results, aborted, error}),
});
