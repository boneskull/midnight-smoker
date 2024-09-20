import {ERROR, MIDNIGHT_SMOKER, OK} from '#constants';
import {type ReporterContext} from '#reporter/reporter-context';
import * as assert from '#util/assert';
import {createDebug} from '#util/debug';
import Debug from 'debug';
import {type Except} from 'type-fest';
import * as xs from 'xstate';

/**
 * `ActorOutput` is a convention for an actor output.
 *
 * Machines adhering to this convention can exit with a {@link ActorOutputOk} or,
 * in case of error, a {@link ActorOutputError}.
 *
 * The two types are discriminated on the `type` property.
 */
export type ActorOutput<
  Ok extends object = object,
  Err extends Error = Error,
> = ActorOutputError<Err> | ActorOutputOk<Ok>;

/**
 * Represents the output of a machine when an error occurs.
 *
 * @template Err The type of the error.
 * @template Ctx The type of the context object.
 */
export type ActorOutputError<Err extends Error = Error, Ctx = unknown> = {
  actorId: string;
  error: Err;
  type: typeof ERROR;
} & Ctx;

/**
 * Represents the output of a machine when it is in a successful state.
 *
 * @template Ctx - The type of the additional context information.
 */
export type ActorOutputOk<Ctx = unknown> = {
  actorId: string;
  type: typeof OK;
} & Ctx;

export type OmitSignal<T extends {signal: any}> = Except<
  T,
  'signal',
  {requireExactProps: true}
>;

/**
 * Used by {@link runActor} to determine if the `input` option is required for
 * the provided logic.
 *
 * @internal
 */
type RequiredOptions<TLogic extends xs.AnyActorLogic> =
  undefined extends xs.InputFrom<TLogic> ? never : 'input';

/**
 * Asserts that the actor output is not ok and throws an error if it is.
 *
 * @template Ok - The type of the successful actor output.
 * @template Err - The type of the error in the actor output.
 * @param output - The actor output to be checked.
 * @throws AssertionError - If the actor output is ok.
 */
export function assertActorOutputNotOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: ActorOutput<Ok, Err>): asserts output is ActorOutputError<Err> {
  assert.equal(
    output.type,
    ERROR,
    'Expected prop `type` to be "ERROR" in actor output',
  );
}

/**
 * Asserts that the actor output is of type `MachineOutputOk`. If the output is
 * not of type `MachineOutputOk`, an `AssertionError` is thrown.
 *
 * @template Ok - The type of the successful actor output.
 * @template Err - The type of the error in the actor output.
 * @param output - The actor output to be asserted.
 * @throws AssertionError if the output is not of type `MachineOutputOk`.
 */
export function assertActorOutputOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: ActorOutput<Ok, Err>): asserts output is ActorOutputOk<Ok> {
  assert.equal(
    output.type,
    OK,
    'Expected prop `type` to be "OK" in actor output',
  );
}

/**
 * Monkeypatches {@link ActorRef.logger} with a debug instance.
 *
 * @template T - The type of the actor.
 * @param {T} actor - The actor to monkeypatch.
 * @param {string} namespace - The custom namespace for the logger.
 * @returns {T} - The monkeypatched actor.
 * @see {@link https://github.com/statelyai/xstate/issues/4634}
 * @todo Currently, XState's API only allows the setting of `logger` via
 *   `createActor`; it should also work with `spawn`, `spawnChild`, and/or
 *   `invoke`.
 */
export function monkeypatchActorLogger<T extends xs.AnyActorRef>(
  actor: T,
  namespace: string,
): T {
  // @ts-expect-error private
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  actor.logger = actor._actorScope.logger = Debug(
    `${MIDNIGHT_SMOKER}:actor:${namespace}`,
  );
  return actor;
}

export function reporterContextWithSignal(
  ctx: OmitSignal<ReporterContext>,
  signal: AbortSignal,
): ReporterContext {
  Object.assign(ctx, {signal});
  return ctx as unknown as ReporterContext;
}

/**
 * Creates an actor, starts it, and waits for it to complete.
 *
 * Only supports state machine and `Promise` logic
 *
 * @template TLogic Actor logic type
 * @param logic Actor logic
 * @param options Required or optional (depends on `TLogic`)
 * @returns The output of the actor
 */
export async function runActor<
  TLogic extends xs.AnyStateMachine | xs.PromiseActorLogic<any, any, any>,
>(
  logic: TLogic,
  ...[options]: xs.ConditionalRequired<
    [
      options?: {
        [K in RequiredOptions<TLogic>]: unknown;
      } & xs.ActorOptions<TLogic>,
    ],
    xs.IsNotNever<RequiredOptions<TLogic>>
  >
): Promise<xs.OutputFrom<TLogic>> {
  const actor = xs.createActor(logic, options);
  const p = xs.toPromise(actor);
  actor.start();
  try {
    return await p;
  } catch (err) {
    debug(`Actor %s rejected:`, actor.id, err);
    throw err;
  } finally {
    actor.stop();
  }
}

const debug = createDebug(__filename);

/**
 * Action expected for all machines to implement.
 *
 * @privateRemarks
 * This can be thought of as a generic "hook" that can be used to provide
 * differing behavior in tests (when no other actions are appropriate).
 */
export const INIT_ACTION = '__init__';

/**
 * Default implementation for {@link INIT_ACTION}
 *
 * @privateRemarks
 * These types seem a little fragile.
 */
export const DEFAULT_INIT_ACTION = <
  TContext extends xs.MachineContext,
  TExpressionEvent extends xs.AnyEventObject,
  TParams extends undefined | xs.ParameterizedObject['params'],
  TEvent extends xs.EventObject,
  TActor extends xs.ProvidedActor,
>() => xs.assign<TContext, TExpressionEvent, TParams, TEvent, TActor>({});
