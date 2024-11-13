import {type Serializable} from '#schema/serializable';
import {isFunction, isObject} from '#util/guard/common';
import {type JsonifiableObject} from 'type-fest/source/jsonifiable';

/**
 * Type guard for a {@link Serializable} object.
 *
 * @param value Any value
 * @returns - `true` if `value` is an object with a `toJSON` method
 */
export function isSerializable<
  T,
  U extends JsonifiableObject = JsonifiableObject,
>(value: T): value is Serializable<U> & T {
  return isObject(value) && 'toJSON' in value && isFunction(value.toJSON);
}
