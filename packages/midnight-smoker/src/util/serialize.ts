/**
 * "Serialization"-related utils and types.
 *
 * Some classes in `midnight-smoker` use the `toJSON()` method to provide a
 * "serialized" version of themselves. These classes may also implement the same
 * interface as a serialized version of themselves. The {@link serialize}
 * convenience function helps handle these cases.
 *
 * @packageDocumentation
 */
import {type Serializable, type Serialized} from '#schema/serializable';
import {isSerializable} from '#util/guard/serializable';

/**
 * Serializes an array of {@link Serializable}s to an array of
 * {@link Serialized}s.
 *
 * @param value - The value to be serialized.
 * @returns The original value.
 */
export function serialize<T extends Serializable<any>>(
  value: readonly T[],
): Serialized<T>[];

/**
 * Serializes an object value to JSON-able if it is serializable.
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

export function serialize<T>(value: readonly T[]): readonly T[];

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
