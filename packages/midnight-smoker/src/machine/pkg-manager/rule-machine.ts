import {FAILED, FINAL, OK} from '#constants';
import {AbortError} from '#error/abort-error';
import {fromUnknownError} from '#error/from-unknown-error';
import {MachineError} from '#error/machine-error';
import {RuleError} from '#error/rule-error';
import {RuleContext} from '#rule/rule-context';
import {type LintManifest} from '#schema/lint-manifest';
import {type SomeRuleConfig} from '#schema/rule-options';
import {type StaticRuleContext} from '#schema/rule-static';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {isSmokerError} from '#util/error-util';
import {uniqueId} from '#util/unique-id';
import {asResult} from '#util/util';
import {isNumber} from 'lodash';
import assert from 'node:assert';
import {
  assign,
  enqueueActions,
  fromPromise,
  setup,
  type ActorRef,
  type ActorRefFrom,
  type Snapshot,
} from 'xstate';
import {serialize} from '../../util/serialize';
import {
  type CheckInput,
  type CheckOutput,
  type CheckOutputFailed,
  type CheckOutputOk,
  type PkgManagerMachineCheckErrorEvent,
  type PkgManagerMachineCheckResultEvent,
} from './pkg-manager-machine-events';

/**
 * Input for {@link RuleMachine}
 */
export interface RuleMachineInput {
  /**
   * The {@link SomeRuleDef RuleDef} to which this machine is bound
   */
  def: SomeRuleDef;

  /**
   * The unique component ID of the {@link RuleMachineInput.def}
   */
  ruleId: string;

  /**
   * The user-supplied config for {@link RuleMachineInput.def}
   */
  config: SomeRuleConfig;

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
   * The signal to abort the operation
   */
  signal: AbortSignal;
}

/**
 * Context for {@link RuleMachine}
 */
export interface RuleMachineContext extends RuleMachineInput {
  results: CheckOutput[];
  checkRefs?: Record<string, ActorRefFrom<typeof check>>;
  aborted?: boolean;
  error?: MachineError;
}

/**
 * Event upon which the {@link RuleMachine} will run
 * {@link RuleMachineInput.def.check}
 */
export interface RuleMachineCheckEvent {
  type: 'CHECK';

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
}

/**
 * Event emitted when the {@link check} actor is done
 *
 * @event
 */
export interface RuleMachineCheckActorDoneEvent {
  type: 'xstate.done.actor.check.*';
  output: CheckOutput;
}

export interface RuleMachineCheckActorErrorEvent {
  type: 'xstate.error.actor.check.*';
  error: Error;
}

/**
 * Event emitted when a check is complete.
 *
 * @remarks
 * This may only be consumed by test code.
 * @event
 */
export interface RuleMachineCheckResultEvent {
  output: CheckOutput;
  config: SomeRuleConfig;
  type: 'CHECK_RESULT';
}

export interface RuleMachineCheckErrorEvent {
  error: RuleError;
  type: 'CHECK_ERROR';
}

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
  | RuleMachineCheckActorDoneEvent;

/**
 * Runs a single {@link RuleDef.check} against an installed package using
 * user-provided configuration
 */
export const check = fromPromise<CheckOutput, CheckInput>(
  async ({self, input}) => {
    const {ctx: staticCtx, opts, def, ruleId, signal} = input;
    if (signal.aborted) {
      throw new AbortError(signal.reason, self.id);
    }

    const ctx = RuleContext.create(def, staticCtx, ruleId);

    try {
      await def.check(ctx, opts);
    } catch (err) {
      throw new RuleError(
        `Rule "${ruleId}" threw an exception`,
        ctx,
        ruleId,
        fromUnknownError(err),
      );
    }
    const result = ctx.finalize();
    const manifest = asResult(serialize(input.manifest));
    switch (result.type) {
      case 'OK': {
        const output: CheckOutputOk = {
          opts,
          manifest,
          ruleId,
          result,
          type: OK,
          actorId: self.id,
          installPath: ctx.installPath,
        };
        return output;
      }
      case 'FAILED': {
        const output: CheckOutputFailed = {
          installPath: ctx.installPath,
          opts,
          manifest,
          ruleId,
          // TODO fix this readonly disagreement.  it _should_ be read-only, but that breaks somewhere down the line
          result: [...result.result],
          actorId: self.id,
          type: FAILED,
        };

        return output;
      }
    }
  },
);

/**
 * Output of {@link RuleMachine}
 */
export interface RuleMachineOutput {
  results: CheckOutput[];
  aborted?: boolean;
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
        {
          spawn,
          context: {
            def,
            config: {opts},
            checkRefs = {},
            ruleId,
            signal,
          },
        },
        {ctx, manifest}: {ctx: StaticRuleContext; manifest: LintManifest},
      ) => {
        const id = uniqueId({prefix: 'check', postfix: ruleId});
        const actor = spawn('check', {
          id,
          input: {def, ruleId, opts, ctx, manifest, signal},
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
      ({enqueue, context}, output: CheckOutput) => {
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
        const evt: PkgManagerMachineCheckErrorEvent = {
          type: 'CHECK_ERROR',
          error,
        };
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
        enqueue.emit(evt as RuleMachineCheckErrorEvent);
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

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[actorId]: _, ...rest} = checkRefs;
        enqueue.assign({checkRefs: rest});
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
      exit: [assign({checkRefs: undefined})],
      on: {
        'xstate.done.actor.check.*': {
          actions: [
            {
              type: 'sendCheckResult',
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
        'xstate.error.actor.check.*': [
          {
            guard: ({event: {error}}) => isSmokerError(AbortError, error),
            actions: [
              {
                type: 'stopCheckActor',
                params: ({event: {type}}) => {
                  // TODO: is there a better way to get the actor ID?
                  return type.split('.')[3];
                },
              },
            ],
            target: 'aborted',
          },
          {
            actions: [
              {
                type: 'sendCheckError',
                params: ({event: {error}}) => {
                  assert.ok(isSmokerError(RuleError, error));
                  return error;
                },
              },
              {type: 'assignError', params: ({event: {error}}) => ({error})},
              {
                type: 'stopCheckActor',
                params: ({event: {type}}) => {
                  // TODO: is there a better way to get the actor ID?
                  return type.split('.')[3];
                },
              },
            ],
          },
        ],
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
    aborted: {entry: [assign({aborted: true})], type: FINAL},
  },
  output: ({context: {results, aborted, error}}) => ({results, aborted, error}),
});
