/**
 * Utils for working with keypaths (e.g., `some.object[0].key`)
 *
 * @packageDocumentation
 */
import * as assert from '#util/assert';
import {stringToPath as toPath} from 'remeda';
import {type Tagged} from 'type-fest';

/**
 * An string array representing a deeply-nested value within an object (i.e. a
 * _keypath_).
 *
 * This branded type can be used by whatever needs it.
 */
export type Keypath = Tagged<string[], 'Keypath'>;

/**
 * Matches a string that can be displayed as an integer when converted to a
 * string (via `toString()`)
 *
 * It may not be a
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger safe integer},
 * but it's an integer.
 */
const INT_STRING_REGEXP = /^(0|[1-9][0-9]*)$/;

/**
 * Matches a string that cannot be expressed using dot notation (and must use
 * bracket notation)
 */
const CANNOT_USE_DOT_NOTATION_REGEXP = /[^A-Za-z0-9_$]/;

/**
 * Returns `true` if `key` can be coerced to an integer, which will cause it to
 * be wrapped in brackets (`[${key}]`) when used as a key in an object
 *
 * @param key Some string
 * @returns `true` if `key` can be coerced to an integer
 */
const isIntegerLike = (key: string): boolean => INT_STRING_REGEXP.test(key);

/**
 * Returns `true` if `key` needs to be wrapped in `['${key}'`] to be used as a
 * key in an object
 *
 * @param key Some string
 * @returns `true` if `key` needs to be wrapped in `['${key}']`
 */
const keyCannotUseDotNotation = (key: string): boolean =>
  CANNOT_USE_DOT_NOTATION_REGEXP.test(key);

/**
 * Converts a {@link Keypath} to a string using dots or braces as appropriate
 *
 * @param path Keypath to format
 * @returns Formatted keypath
 */
export const formatKeypath = (path: Keypath | string[]): string => {
  const output = path.reduce((output, key) => {
    if (isIntegerLike(key)) {
      return `${output}[${key}]`;
    }
    return keyCannotUseDotNotation(key)
      ? `${output}['${key}']`
      : `${output}.${key}`;
  });
  assert.deepEqual(
    toPath(output),
    path,
    `Generated keypath is invalid: ${output}; please report this bug!`,
  );
  return output;
};
