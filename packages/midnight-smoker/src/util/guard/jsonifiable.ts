import {
  isBoolean,
  isError,
  isFunction,
  isNull,
  isNumber,
  isObject,
  isString,
} from '#util/guard/common';
import {type Jsonifiable, type JsonPrimitive} from 'type-fest';
import {
  type JsonifiableArray,
  type JsonifiableObject,
} from 'type-fest/source/jsonifiable';

export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    isString(value) || isNumber(value) || isBoolean(value) || isNull(value)
  );
}

export function isJsonifiableArray(value: unknown): value is JsonifiableArray {
  return Array.isArray(value) && value.every(isJsonifiable);
}

export function isJsonifiableObject(
  value: unknown,
): value is JsonifiableObject {
  return (
    isObject(value) &&
    !isFunction(value) &&
    !isError(value) &&
    Object.values(value).every(isJsonifiable)
  );
}

export function isJsonifiable(value: unknown): value is Jsonifiable {
  return (
    isJsonPrimitive(value) ||
    isJsonifiableArray(value) ||
    isJsonifiableObject(value)
  );
}
