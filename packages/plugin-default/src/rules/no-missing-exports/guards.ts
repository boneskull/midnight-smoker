/**
 * "Guards" for the `no-missing-exports` rule.
 *
 * These guards are not necessarily _type guards_.
 */

import {glob} from 'glob';
import isEsm from 'is-file-esm';
import fs from 'node:fs/promises';

import {
  CANONICAL_PACKAGE_JSON,
  CONDITIONAL_EXPORT_DEFAULT,
  TS_DECLARATION_EXTENSIONS,
  TYPE_MODULE,
} from './constants';
import {
  type ExportConditions,
  type Exports,
  type NMEContext,
  type NMEGuard,
} from './types';

/**
 * Greedy extname
 *
 * @param filepath Filepath
 * @returns The extension of the file
 */
const extname = (filepath: string) => /(\.[a-z.]+)$/.exec(filepath)?.[1];

/**
 * Checks if the given string is a glob pattern.
 *
 * @param allegedPattern - The string to check.
 * @returns `true` if the string is a glob pattern; `false` otherwise.
 */
export const isGlobPattern: NMEGuard<string> = (allegedPattern) =>
  glob.hasMagic(allegedPattern, {magicalBraces: true});

/**
 * Returns `true` if the value is both a string and empty
 *
 * @param value A string to check
 * @returns `true` if the value is both a string and empty
 */
export const isEmptyString: NMEGuard<string> = (value) => value === '';

/**
 * Returns `true` if the file extension is not a valid TypeScript declaration
 * file extension.
 *
 * Should be called when a conditional export is named `types`.
 *
 * @param filepath Path to alleged TypeScript declaration file
 * @param ctx Context object
 * @returns Returns `true` if the file extension is not a valid TypeScript
 *   declaration file extension
 */
export const conditionalExportIsNotTsDeclaration: NMEGuard<string> = (
  filepath,
) =>
  !TS_DECLARATION_EXTENSIONS.includes(
    extname(filepath) as (typeof TS_DECLARATION_EXTENSIONS)[number],
  );

/**
 * Returns `true` if a glob pattern matches nothing in the install path.
 *
 * In particular, we're looking for a glob-like export value which matches no
 * files.
 *
 * @param pattern Glob pattern
 * @param ctx Context object
 * @returns `true` if the glob pattern matches nothing in the install path
 */
export const globPatternMatchesNothing: NMEGuard<string> = async (
  pattern: string,
  ctx?: NMEContext,
) => {
  if (ctx?.installPath) {
    try {
      const results = await glob(pattern, {cwd: ctx.installPath});
      return !results.length;
    } catch {}
  }
  return false;
};

/**
 * Checks if the given file is a CommonJS script (i.e., not an ES module).
 *
 * @param filepath - The path to the file to check.
 * @returns A promise that resolves to `true` if the file is a CommonJS script;
 *   `false` otherwise.
 */

export const isFileCJS: NMEGuard<string> = async (filepath, ctx) =>
  !(await isFileESM(filepath, ctx));

/**
 * If {@link exportsValue} is a {@link ExportConditions} and contains a `default`
 * prop, return `true` if said key is _not_ the last key in the object
 *
 * @param exportConditions - Value of the `exports` field in `package.json`
 * @param ctx - Context object
 * @returns `true` if the `default` key is not the last key in the object
 */
export const isDefaultConditionalNotLast: NMEGuard<
  unknown,
  NMEContext<ExportConditions>
> = (_, ctx) => {
  const keys = Object.keys(ctx.exportsValue);
  return keys[keys.length - 1] !== CONDITIONAL_EXPORT_DEFAULT;
};

export const isObject = ((value: unknown): value is object =>
  value !== null && typeof value === 'object') satisfies NMEGuard;

/**
 * Resolves `true` if the file is an ES module; `false` otherwise
 *
 * @param filepath Path to the file to check
 * @returns `true` if the file is an ES module; `false` otherwise
 */
export const isFileESM: NMEGuard<string> = async (filepath) => {
  try {
    return (await isEsm(filepath)).esm;
  } catch {
    return false;
  }
};

/**
 * Returns `true` if `filepath` is missing or unreadable
 *
 * @remarks
 * This might want to be a call to {@link fs.access} instead.
 * @returns `true` if `filepath` is missing or unreadable
 */
export const isFileMissing: NMEGuard<string> = async (filepath: string) => {
  try {
    await fs.stat(filepath);
    return false;
  } catch {
    return true;
  }
};

/**
 * Returns `true` if the `package.json` contains `type: module`
 *
 * @returns `true` if the `package.json` contains `type: module`
 * @see {@link isEsm}
 */

export const isPackageESM: NMEGuard<[]> = (_, {pkgJson}) =>
  'type' in pkgJson && pkgJson.type === TYPE_MODULE;

export const packageJsonMissingField: NMEGuard<string> = (field, {pkgJson}) =>
  !(field in pkgJson);

export const hasConditionalExport = ((
  _: unknown,
  ctx: NMEContext,
): ctx is NMEContext<ExportConditions> =>
  ctx.exportsValue !== null &&
  typeof ctx.exportsValue === 'object') satisfies NMEGuard;

export const packageJsonExportIsNotCanonical: NMEGuard<Exports> = (value) =>
  typeof value === 'string' && value !== CANONICAL_PACKAGE_JSON;
