/**
 * Exports some common utilities.
 *
 * @privateRemarks
 * This could (and perhaps should) be replaced with our own implementations.
 * @packageDocumentation
 */

export {
  isBoolean,
  isEmpty,
  isError,
  isFunction,
  isNumber,
  isObjectType as isObject,
  isString,
} from 'remeda';

export const isNull = (value: unknown): value is null => value === null;
