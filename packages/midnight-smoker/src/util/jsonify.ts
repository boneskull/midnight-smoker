/**
 * Provides {@link jsonify}, which converts an arbitrary value into something
 * `JSON`-serializable.
 *
 * @packageDocumentation
 * @see {@link serialize}
 */

import {isError, isFunction, isObject} from '#util/guard/common';
import {
  isJsonifiable,
  isJsonifiableObject,
  isJsonPrimitive,
} from '#util/guard/jsonifiable';
import {isSerializable} from '#util/guard/serializable';
import {serialize} from '#util/serialize';
import {mapValues, pickBy} from 'remeda';
import {type Jsonifiable} from 'type-fest/source/jsonifiable';

/**
 * Coerces something into something we can output into JSON.
 *
 * The returned JSON _is not intended to be a serialization format_; it should
 * not be used to marshal and un-marshal the data.
 *
 * The main use-case here is to transform unknown data (usually an `Error`) into
 * a JSON blob which can then be dumped into the terminal.
 */
export function jsonify(value: unknown): Jsonifiable {
  // Serializable means there's intent to return something via toJSON.
  if (isSerializable(value)) {
    return serialize(value);
  }

  // get primitives out of the way next
  if (isJsonPrimitive(value)) {
    return value;
  }

  // it does not matter if the array is a JsonifiableArray or not
  if (Array.isArray(value)) {
    return value.map(jsonify);
  }

  // if the entire object is jsonifiable, we can just return a clone of it.
  // returning the clone ensures that non-enumerable properties shake out.
  if (isJsonifiableObject(value)) {
    return {...value};
  }

  // an Error does not have enumerable properties, so we have to special-case
  // it.  as of now I don't want to include the stack trace, but that might
  // change
  if (isError(value)) {
    return value.toString();
  }

  // plain objects
  if (isObject(value) && !isFunction(value)) {
    return mapValues(pickBy(value, isJsonifiable), jsonify);
  }

  return null;
}