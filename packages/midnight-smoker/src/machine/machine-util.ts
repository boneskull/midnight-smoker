import Debug from 'debug';
import {map, memoize, uniqBy} from 'lodash';
import {AssertionError} from 'node:assert';
import {type AnyActorRef} from 'xstate';
import {MIDNIGHT_SMOKER} from '../constants';

export function makeId() {
  return Math.random().toString(36).substring(7);
}

export function monkeypatchActorLogger<T extends AnyActorRef>(
  actor: T,
  namespace: string,
): T {
  // https://github.com/statelyai/xstate/issues/4634
  // @ts-expect-error private
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  actor.logger = actor._actorScope.logger = Debug(
    `${MIDNIGHT_SMOKER}:${namespace}`,
  );
  return actor;
}

export interface MachineOutputLike {
  id: string;
  type: string;
}

export type MachineOutputOk<Ctx extends object = object> = {
  type: 'OK';
  id: string;
} & Ctx;

export type MachineOutputError<
  Err extends Error = Error,
  Ctx extends object = object,
> = {
  id: string;
  type: 'ERROR';
  error: Err;
} & Ctx;

export type MachineOutput<
  Ok extends object = object,
  Err extends Error = Error,
> = MachineOutputOk<Ok> | MachineOutputError<Err>;

export function isMachineOutputOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: MachineOutput<Ok, Err>): output is MachineOutputOk<Ok> {
  return output.type === 'OK';
}

export function isMachineOutputNotOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: MachineOutput<Ok, Err>): output is MachineOutputError<Err> {
  return output.type === 'ERROR';
}

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

export const uniquePkgNames = memoize(
  (manifests: {pkgName: string}[]): string[] =>
    map(uniqBy(manifests, 'pkgName'), 'pkgName'),
);
