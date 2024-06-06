import {isFunction, isObject} from 'lodash';
import {type JsonValue} from 'type-fest';

export interface Serializable<T extends JsonValue = JsonValue> {
  toJSON(): T;
}

/**
 * Type guard for an object with a `toJSON` method.
 *
 * @param value Any value
 * @returns - `true` if `value` is an object with a `toJSON` method
 */

export function isSerializable<T, U extends JsonValue = JsonValue>(
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

export function serialize<T extends Serializable<any>>(
  value: T[] | readonly T[],
): Serialized<T>[];

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

export function serialize<T extends Serializable<any>>(value: T): Serialized<T>;

export function serialize<T>(value: T): T;

export function serialize<T>(value: T) {
  if (Array.isArray(value)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value.map(serialize);
  }
  if (isSerializable(value)) {
    return value.toJSON();
  }
  return value;
}

export type Serialized<T> = T extends Serializable<infer U> ? U : T;
