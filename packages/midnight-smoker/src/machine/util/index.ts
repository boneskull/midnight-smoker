import {MIDNIGHT_SMOKER} from '#constants';
import Debug from 'debug';
import {map, memoize, uniqBy} from 'lodash';
import {AssertionError} from 'node:assert';
import {type AnyActorRef} from 'xstate';

/**
 * `MachineOutput` is a convention for machine output.
 *
 * Machines adhering to this convention can exit with a {@link MachineOutputOk}
 * or, in case of error, a {@link MachineOutputError}.
 *
 * The two types are discriminated on the `type` property.
 */
export type MachineOutput<
  Ok extends object = object,
  Err extends Error = Error,
> = MachineOutputOk<Ok> | MachineOutputError<Err>;

/**
 * Represents the output of a machine when an error occurs.
 *
 * @template Err The type of the error.
 * @template Ctx The type of the context object.
 */
export type MachineOutputError<
  Err extends Error = Error,
  Ctx extends object = object,
> = {
  id: string;
  type: 'ERROR';
  error: Err;
} & Ctx;

/**
 * Represents the output of a machine when it is in a successful state.
 *
 * @template Ctx - The type of the additional context information.
 */
export type MachineOutputOk<Ctx extends object = object> = {
  type: 'OK';
  id: string;
} & Ctx;

/**
 * @deprecated
 */
export interface MachineOutputLike {
  id: string;
}

/**
 * Asserts that the machine output is not ok and throws an error if it is.
 *
 * @template Ok - The type of the successful machine output.
 * @template Err - The type of the error in the machine output.
 * @param output - The machine output to be checked.
 * @throws AssertionError - If the machine output is ok.
 */
export function assertMachineOutputNotOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: MachineOutput<Ok, Err>): asserts output is MachineOutputError<Err> {
  if (isMachineOutputOk(output)) {
    throw new AssertionError({
      message: 'Expected an error in machine output',
      actual: output,
    });
  }
}

/**
 * Asserts that the machine output is of type `MachineOutputOk`. If the output
 * is not of type `MachineOutputOk`, an `AssertionError` is thrown.
 *
 * @template Ok - The type of the successful machine output.
 * @template Err - The type of the error in the machine output.
 * @param output - The machine output to be asserted.
 * @throws AssertionError if the output is not of type `MachineOutputOk`.
 */
export function assertMachineOutputOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: MachineOutput<Ok, Err>): asserts output is MachineOutputOk<Ok> {
  if (isMachineOutputNotOk(output)) {
    throw new AssertionError({
      message: 'Unexpected error in machine output',
      actual: output,
    });
  }
}

/**
 * Checks if the given machine output is an error.
 *
 * @template Ok - The type of the successful machine output.
 * @template Err - The type of the error in the machine output.
 * @param output - The machine output to check.
 * @returns `true` if the output is an error, `false` otherwise.
 */
export function isMachineOutputNotOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: MachineOutput<Ok, Err>): output is MachineOutputError<Err> {
  return output.type === 'ERROR';
}

/**
 * Checks if the provided `output` is of type `MachineOutputOk`.
 *
 * @template Ok - The type of the successful machine output.
 * @template Err - The type of the error in the machine output.
 * @param output - The output to check.
 * @returns `true` if the `output` is of type `MachineOutputOk`, `false`
 *   otherwise.
 */
export function isMachineOutputOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: MachineOutput<Ok, Err>): output is MachineOutputOk<Ok> {
  return output.type === 'OK';
}

/**
 * Generates a random ID.
 *
 * @returns A random ID string.
 */
export function makeId() {
  return Math.random().toString(36).substring(7);
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
    `${MIDNIGHT_SMOKER}:${namespace}`,
  );
  return actor;
}

export const uniquePkgNames = memoize(
  (manifests: {pkgName: string}[]): string[] =>
    map(uniqBy(manifests, 'pkgName'), 'pkgName'),
);
