/**
 * Contains a bunch of functions for formatting strings for console output.
 *
 * @packageDocumentation
 */

import {SYSTEM} from '#constants';
import {type SmokerErrorCode} from '#error/codes';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {isError, isNumber, isString} from '#util/guard/common';
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
import path from 'node:path';
import {inspect} from 'node:util';
import stringWidth from 'string-width';
import terminalLink from 'terminal-link';
import wrapAnsi from 'wrap-ansi';

import {getStackRenderer, type Styles} from './stack-renderer';

const DEFAULT_WRAP = process.stderr.columns ?? 80;

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
export const formatNameAndVersion = (name: string, version?: string) => {
  return version
    ? `${cyanBright(name)}${cyan('@')}${cyanBright(version)}`
    : cyanBright(name);
};

/**
 * A newline
 */
export const NL = '\n';

/**
 * A double newline
 */
export const DOUBLE_NL = NL.repeat(2);

/**
 * Joins an array into a string (by newlines, by default)
 *
 * The point of this is to have a default string to join by.
 *
 * @param lines String array
 * @param separator Join separator
 * @returns New string with all lines joined
 */
export const joinLines = (lines: string[], separator = NL): string => {
  return lines.join(separator);
};

/**
 * Options for {@link indent}
 */
export type IndentOptions = {
  /**
   * Number of spaces to indent by
   */
  level?: number;

  /**
   * Prefix to prepend to each line
   */
  prefix?: string;

  /**
   * If true, trim whitespace from end of each line after indenting
   *
   * @defaultValue true
   */
  trimEnd?: boolean;

  /**
   * Force wrap text to a certain width
   */
  wrap?: number;
};

/**
 * Indents all lines in a string
 *
 * @param value String to indent
 * @param options Options
 * @returns New string indented
 */
export function indent(value: string, options?: IndentOptions): string;

/**
 * Indents all lines in a string by `level` spaces
 *
 * @param value String to indent
 * @param level Number of spaces to indent by (default: 1)
 * @returns New string indented
 */
export function indent(value: string, level?: number): string;

/**
 * Indents all lines in a string by `level` spaces
 *
 * @param value String to indent
 * @param level Number of spaces to indent by (default: 1)
 * @returns New string indented
 */
export function indent(value: readonly string[], level?: number): string[];

/**
 * Indents all lines in a string array by `level * 2` spaces
 *
 * @param value String array
 * @param level Number of spaces to indent by
 * @returns New array with all strings indented
 */
export function indent(
  value: readonly string[],
  options?: IndentOptions,
): string[];

export function indent(
  value: readonly string[] | string,
  optionsOrLevel?: IndentOptions | number,
): string | string[] {
  const options = isNumber(optionsOrLevel)
    ? {level: optionsOrLevel}
    : optionsOrLevel ?? {};
  const {level = 1, prefix = '', trimEnd = true} = options;
  const indentStr = prefix + ' '.repeat(2 * level);
  const {wrap = DEFAULT_WRAP} = options;

  if (isString(value)) {
    // note: wrapAnsi's "trim" option trims both leading and trailing whitespace.
    // we do not want leading whitespace trimmed, so we do it ourselves.
    const result = wrapAnsi(value, wrap - stringWidth(indentStr), {
      hard: true,
      trim: false,
      wordWrap: true,
    })
      .split(NL)
      .map((line) => `${indentStr}${trimEnd ? line.trimEnd() : line}`)
      .join(NL);
    return result;
  }
  return value.map((line) => indent(line, {level, prefix, wrap}));
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
export const formatPkgManager = ({
  bin,
  name,
  version,
}: StaticPkgManagerSpec) => {
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
};

/**
 * Returns a formatted package name.
 *
 * @param pkgName Package name
 * @returns Formatted string
 */

export const formatPackage = (pkgName: string) => {
  return magentaBright(pkgName);
};

/**
 * Returns a formatted `message` prop of an `Error` object
 *
 * @param message The message
 * @returns Formatted string
 */
export const formatErrorMessage = (message: string) => {
  return redBright(message);
};

/**
 * Returns a formatted {@link SmokerErrorCode}.
 *
 * @param code Error code
 * @returns Formatted string
 */
export const formatCode = (code: SmokerErrorCode) => {
  return `${black('[')}${grey(code)}${black(']')}`;
};

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
export const formatStackTrace = (err: Error, level = 1): string => {
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
    // if cause is present but not an error, the best we can do is dump it
    if (isError(err.cause)) {
      level++;
      output = [
        ...output,
        indent(whiteBright(italic('Reason:')), level),
        formatStackTrace(err.cause, level),
      ];
    } else {
      level++;
      output = [
        ...output,
        indent(whiteBright(italic('Reason:')), level),
        indent(
          inspect(err.cause, {colors: true, depth: 2, sorted: true}),
          level,
        ),
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
};

/**
 * Returns a relative path suitable for display (with leading `.` and
 * `path.sep`)
 *
 * @param value Path
 * @param cwd Path from which to make the path relative
 * @returns A relative path, prepended with a `.` and path separator
 */

export const hrRelativePath = (value: string, cwd = process.cwd()): string => {
  const relative = path.relative(cwd, value);
  return relative.startsWith('..') ? relative : `.${path.sep}${relative}`;
};

/**
 * String terminator sequences
 *
 * Copied from {@link https://npm.im/ansi-regex ansi-regex}.
 *
 * License: {@link https://github.com/chalk/ansi-regex/blob/main/license} *
 */
const ST = '(?:\\u0007|\\u001B\\u005C|\\u009C)';

/**
 * RegExp to match ANSI escape codes
 *
 * Copied from {@link https://npm.im/ansi-regex ansi-regex}.
 *
 * License: {@link https://github.com/chalk/ansi-regex/blob/main/license}
 */
const ANSI_REGEX = new RegExp(
  [
    `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  ].join('|'),
  'g',
);

/**
 * Strips ANSI escape codes from strings. I hope
 *
 * @param value Some string
 * @returns String w/o ANSI escape codes
 */
export const stripAnsi = (value: string): string => {
  return value.replace(ANSI_REGEX, '');
};

/**
 * Formats a URL for the console, styled as a clickable link if supported
 *
 * @param url Link URL
 * @param text Text to link
 * @param options Options for {@link https://npm.im/terminal-link terminal-link}
 * @returns Linked text (or text with URL in parens if unsupported)
 */
export const formatUrl = (
  url: string | URL,
  text = url,
  options?: terminalLink.Options,
): string => {
  return terminalLink(`${text}`, `${url}`, options);
};
