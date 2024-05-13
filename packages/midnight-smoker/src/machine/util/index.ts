import {MIDNIGHT_SMOKER} from '#constants';
import {type WorkspaceInfo} from '#schema/workspaces';
import Debug from 'debug';
import {map, memoize, uniqBy} from 'lodash';
import {AssertionError} from 'node:assert';
import {type AnyActorRef} from 'xstate';

export * from './constants';

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
  type: 'ERROR';
  error: Err;
} & Ctx;

/**
 * Represents the output of a machine when it is in a successful state.
 *
 * @template Ctx - The type of the additional context information.
 */
export type ActorOutputOk<Ctx extends object = object> = {
  type: 'OK';
  id: string;
} & Ctx;

export type MachineEvent<Name extends string, T extends object> = T & {
  type: Name;
  sender: string;
};

/**
 * @deprecated
 */
export interface MachineOutputLike {
  id: string;
}

/**
 * Given an array of objects with `pkgName` and `localPath` properties, returns
 * an array of branded {@link WorkspaceInfo} objects.
 *
 * Any objects missing either of these two properties will be excluded from the
 * resulting array.
 *
 * @param value Array of objects
 * @returns `WorkspaceInfo` array
 */
export function asWorkspacesInfo(
  value: Partial<{pkgName: string; localPath: string}>[],
): WorkspaceInfo[] {
  return value.reduce<WorkspaceInfo[]>((acc, {pkgName, localPath}) => {
    return !pkgName || !localPath
      ? acc
      : [
          ...acc,
          {
            pkgName,
            localPath,
          } as WorkspaceInfo,
        ];
  }, []);
}

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
  return output.type === 'ERROR';
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

/**
 * Given some array of objects having a `pkgName` property, returns a unique
 * array of them.
 *
 * @param manifests - Array of objects with a `pkgName` property
 * @returns Array of unique `pkgName` values
 */
export const uniquePkgNames = memoize(
  (manifests: {pkgName: string}[]): string[] =>
    map(uniqBy(manifests, 'pkgName'), 'pkgName'),
);
