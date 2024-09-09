/**
 * Contains a bunch of functions for formatting strings for console output.
 *
 * @packageDocumentation
 */

import {SYSTEM} from '#constants';
import {type SmokerErrorCode} from '#error/codes';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {
  black,
  cyan,
  cyanBright,
  green,
  greenBright,
  grey,
  italic,
  magentaBright,
  redBright,
  whiteBright,
} from 'chalk';
import {isError, isString} from 'lodash';

import {getStackRenderer, type Styles} from './stack-renderer.js';

/**
 * Given the name of a thing and optionally a version, return a formatted string
 * representation thereof
 *
 * _If you are formatting a package manager, use {@link formatPkgManager}
 * instead._
 *
 * @param name Name
 * @param version Version
 * @returns `name@version` with some colors
 */
export function formatNameAndVersion(name: string, version?: string) {
  return version
    ? `${cyanBright(name)}${cyan('@')}${cyanBright(version)}`
    : cyanBright(name);
}

/**
 * A newline
 */
export const NL = '\n';

/**
 * A double newline
 */
export const DOUBLE_NL = NL.repeat(2);

/**
 * Matches the start of a line
 */
const LINE_REGEX = /^(?!\s*$)/gm;

/**
 * Joins an array into a string (by newlines, by default)
 *
 * The point of this is to have a default string to join by.
 *
 * @param lines String array
 * @param separator Join separator
 * @returns New string with all lines joined
 */
export function joinLines(lines: string[], separator = NL): string {
  return lines.join(separator);
}

/**
 * Indents all lines in a string by `level` spaces
 *
 * @param value String to indent
 * @param level Number of spaces to indent by
 * @returns New string indented
 */
export function indent(value: string, level?: number): string;

/**
 * Indents all lines in a string array by `level * 2` spaces
 *
 * @param value String array
 * @param level Number of spaces to indent by
 * @returns New array with all strings indented
 */
export function indent(value: readonly string[], level?: number): string[];

export function indent(
  value: readonly string[] | string,
  level = 1,
): string | string[] {
  return isString(value)
    ? value.replace(LINE_REGEX, ' '.repeat(2 * level))
    : value.map((line) => indent(line, level));
}

/**
 * Returns a formatted string representation of a {@link StaticPkgManagerSpec}.
 *
 * _If your use-case is not intended for console output_, use the
 * {@link StaticPkgManagerSpec.label label} prop instead.
 *
 * @param spec A pkg manager spec
 * @returns A fancy string representation
 */
export function formatPkgManager({bin, name, version}: StaticPkgManagerSpec) {
  if (!version) {
    return bin
      ? `${greenBright(name)} ${green(`(${SYSTEM})`)}`
      : greenBright(name);
  }

  return bin
    ? `${greenBright(name)}${green('@')}${greenBright(version)} ${green(
        `(${SYSTEM})`,
      )}`
    : `${greenBright(name)}${green('@')}${greenBright(version)}`;
}

/**
 * Returns a formatted package name.
 *
 * @param pkgName Package name
 * @returns Formatted string
 */

export function formatPackage(pkgName: string) {
  return magentaBright(pkgName);
}

/**
 * Returns a formatted `message` prop of an `Error` object
 *
 * @param message The message
 * @returns Formatted string
 */
export function formatErrorMessage(message: string) {
  return redBright(message);
}

/**
 * Returns a formatted {@link SmokerErrorCode}.
 *
 * @param code Error code
 * @returns Formatted string
 */
export function formatCode(code: SmokerErrorCode) {
  return `${black('[')}${grey(code)}${black(']')}`;
}

/**
 * Returns a formatted & cleaned stack trace of an `Error` object
 *
 * Handles `Error.cause` and `AggregateError.errors` properties.
 *
 * @privateRemarks
 * TODO: This should be broken up and moved into the `BaseSmokeError` and
 * `AggregateError`, since it breaks the abstraction
 * @param err Error object
 * @returns Formatted stack trace
 */
export function formatStackTrace(err: Error, level = 1): string {
  const rendererStyles: Styles = {};
  if (level > 0) {
    rendererStyles['pretty-error'] = {
      marginLeft: `${2 * level}`,
    };
  }
  const renderer = getStackRenderer({styles: rendererStyles});
  let output = [renderer.render(err)];

  // handle errors with causes, including agg errors that have a cause
  // TODO move this
  if ('cause' in err) {
    // if cause is present but not an error, we don't want to try to render it,
    // even if 'errors' exists
    if (isError(err.cause)) {
      level++;
      output = [
        ...output,
        indent(whiteBright(italic('Reason:')), level),
        formatStackTrace(err.cause, level),
      ];
    }

    // handle agg errors containing multiple errors
    // TODO move this
  } else if ('errors' in err && Array.isArray(err.errors)) {
    level++;
    const aggregateOutput = err.errors
      .filter(isError)
      .map((error) => formatStackTrace(error, level));
    output = [
      ...output,
      indent(whiteBright(italic('Reasons:')), level),
      ...aggregateOutput,
    ];
  }

  return joinLines(output);
}
