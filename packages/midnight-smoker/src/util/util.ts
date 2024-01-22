/**
 * Gotta have a "util" module
 *
 * @packageDocumentation
 */

import {type ExecaError} from 'execa';
import {isError, isFunction, isObject} from 'lodash';
import type {Opaque} from 'type-fest';
import {z} from 'zod';
import {instanceofSchema} from './schema-util';

/**
 * A branded string referring to a unique identifier.
 */
export type UniqueId = Opaque<string, 'UniqueId'>;

/**
 * A function which generates a {@link UniqueId}
 */
export type UniqueIdFactory = () => UniqueId;

/**
 * Returns a {@link UniqueIdFactory}, which generates a unique ID each time it is
 * called.
 *
 * @param prefix - A prefix to prepend to each ID
 * @returns The unique ID factory, which makes this function factory factory.
 */
export function uniqueIdFactoryFactory(prefix = ''): UniqueIdFactory {
  let nextId = 0;

  return function generateId(): UniqueId {
    return `${prefix}${nextId++}` as UniqueId;
  };
}

export interface Serializable<T = unknown> {
  toJSON(): T;
}

/**
 * Type guard for an object with a `toJSON` method.
 *
 * @param value Any value
 * @returns - `true` if `value` is an object with a `toJSON` method
 */
export function isSerializable<T, U = unknown>(
  value: T,
): value is T & Serializable<U> {
  return isObject(value) && 'toJSON' in value && isFunction(value.toJSON);
}

/**
 * This is just the identity if `T` is not serializable.
 *
 * @param value - The value to be serialized.
 * @returns The original value.
 */
export function serialize<T>(value: T): T;

/**
 * Serializes a value to JSON-able if it is serializable.
 *
 * This should be used where we have a `ThingOne` and a `ThingTwo implements
 * ThingOne` and `ThingTwo.toJSON()` returns a `ThingOne`, and we want the
 * `ThingOne` only. Yes, this is a convention.
 *
 * @param value - The value to be serialized.
 * @returns The serialized value if it is serializable, otherwise the original
 *   value.
 */
export function serialize<T extends Serializable<U>, U = unknown>(value: T): U;
export function serialize<T>(value: T) {
  if (isSerializable(value)) {
    return value.toJSON();
  }
  return value;
}

/**
 * Type guard for {@link NodeJS.ErrnoException}
 *
 * @param value - Any value
 * @returns `true` if `value` is an {@link NodeJS.ErrnoException}
 */
export function isErrnoException(
  value: unknown,
): value is NodeJS.ErrnoException {
  return isError(value) && 'code' in value;
}

const zExecaError = instanceofSchema(Error).pipe(
  z.object({
    command: z.string(),
    exitCode: z.number(),
    all: z.string().optional(),
    stderr: z.string(),
    stdout: z.string(),
    failed: z.boolean(),
  }),
);

/**
 * Type guard for an {@link ExecaError}.
 *
 * If there was a class exported, that'd be better, but there ain't.
 *
 * @param error - Any value
 * @returns `true` if `error` is an {@link ExecaError}
 */
export function isExecaError(error: unknown): error is ExecaError {
  return zExecaError.safeParse(error).success;
}
