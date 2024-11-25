/**
 * Exports some common guards.
 *
 * @packageDocumentation
 */

import * as R from 'remeda';

const {
  isBoolean,
  isEmpty,
  isError,
  isFunction,
  isNumber,
  isObjectType: isObject,
  isStrictEqual,
  isString,
} = R;

export {isBoolean, isEmpty, isError, isFunction, isNumber, isObject, isString};

/**
 * Returns `true` if the value is `null`.
 *
 * @param value Value to check
 * @returns `true` if the value is `null`
 */
export const isNull = isStrictEqual(null);
