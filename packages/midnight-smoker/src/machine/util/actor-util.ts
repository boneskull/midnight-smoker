import {ERROR, MIDNIGHT_SMOKER, OK} from '#constants';
import Debug from 'debug';
import {AssertionError} from 'node:assert';
import {type Simplify} from 'type-fest';
import {type AnyActorRef, type EventObject} from 'xstate';

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
> = ActorOutputOk<Ok> | ActorOutputError<Err>;

/**
 * Represents the output of a machine when an error occurs.
 *
 * @template Err The type of the error.
 * @template Ctx The type of the context object.
 */
export type ActorOutputError<
  Err extends Error = Error,
  Ctx extends object = object,
> = {
  id: string;
  type: typeof ERROR;
  error: Err;
} & Ctx;

/**
 * Represents the output of a machine when it is in a successful state.
 *
 * @template Ctx - The type of the additional context information.
 */
export type ActorOutputOk<Ctx extends object = object> = {
  type: typeof OK;
  id: string;
} & Ctx;

export type MachineEvent<Name extends string, T extends object> = Simplify<
  T & {
    type: Name;
    sender: string;
  }
>;

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
  if (isActorOutputOk(output)) {
    throw new AssertionError({
      message: 'Expected an error in actor output',
      actual: output,
    });
  }
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
  if (isActorOutputNotOk(output)) {
    throw new AssertionError({
      message: 'Unexpected error in actor output',
      actual: output,
    });
  }
}

/**
 * Checks if the given actor output is an error.
 *
 * @template Ok - The type of the successful actor output.
 * @template Err - The type of the error in the actor output.
 * @param output - The actor output to check.
 * @returns `true` if the output is an error, `false` otherwise.
 */
export function isActorOutputNotOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: ActorOutput<Ok, Err>): output is ActorOutputError<Err> {
  return output.type === ERROR;
}

/**
 * Checks if the provided `output` is of type `MachineOutputOk`.
 *
 * @template Ok - The type of the successful actor output.
 * @template Err - The type of the error in the actor output.
 * @param output - The output to check.
 * @returns `true` if the `output` is of type `MachineOutputOk`, `false`
 *   otherwise.
 */
export function isActorOutputOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: ActorOutput<Ok, Err>): output is ActorOutputOk<Ok> {
  return output.type === OK;
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
export function monkeypatchActorLogger<T extends AnyActorRef>(
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

/**
 * A regular expression for extracting the actor ID from an xstate-generated
 * event.
 */
const XSTATE_EVENT_TYPE_REGEX = /^xstate\.(?:error|done)\.actor\.([\s\S]+)$/;

/**
 * Attempts to determine the actor ID from the type of an `xstate`-sent event
 * object.
 *
 * @param event Some xstate-sent event
 * @returns The actor ID (hopefully)
 * @todo Might want to throw if the event type doesn't match the expected
 *   pattern.
 */
export function idFromEventType<
  const T extends `xstate.${'error' | 'done'}.actor.${U}`,
  const U extends string,
>(event: EventObject & {type: T}): U | undefined {
  const matches = event.type.match(XSTATE_EVENT_TYPE_REGEX);
  if (matches) {
    return matches[1] as U;
  }
}
