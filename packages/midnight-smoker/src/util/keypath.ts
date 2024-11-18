/**
 * Utils for working with keypaths (e.g., `some.object[0].key`)
 *
 * @packageDocumentation
 */
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
 * string (via `toString()`). This would represent the index of an array.
 *
 * It may not be a
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger safe integer},
 * but it's an integer.
 */
const INT_STRING_REGEXP = /^(?:0|[1-9][0-9]*)$/;

/**
 * Matches a string that should be wrapped in brackets when converted to part of
 * a keypath
 */
const USE_BRACKET_NOTATION_REGEXP = /[^A-Za-z0-9_ $]/;

/**
 * Matches a string wrapped in single or double quotes
 */
const WRAPPED_QUOTE_REGEXP = /^["'](?<content>.+)["']$/;

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
  USE_BRACKET_NOTATION_REGEXP.test(key);

/**
 * Converts a {@link Keypath} to a string using dots or braces as appropriate
 *
 * @template T Keypath array
 * @param path Keypath to format
 * @returns Formatted keypath
 */
export const formatKeypath = <const T extends Keypath | string[]>(
  path: T,
): string => {
  if (!path?.length) {
    return '';
  }
  return path.reduce((output, key) => {
    key = key.replace(WRAPPED_QUOTE_REGEXP, '$<content>');

    if (isIntegerLike(key)) {
      return `${output}[${key}]`;
    }
    return keyCannotUseDotNotation(key)
      ? `${output}["${key}"]`
      : `${output}.${key}`;
  });
};
