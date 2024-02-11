/* eslint-disable @typescript-eslint/unbound-method */

/**
 * This internal class tries to make some sense of all the export checks in the
 * `no-missing-exports` rule. It's hairy.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import {glob} from 'glob';
import isESMFile from 'is-file-esm';
import type * as Rule from 'midnight-smoker/rule';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {Opaque, PackageJson} from 'type-fest';

export const debug = Debug('midnight-smoker:plugin-default:exports-inspector');

/**
 * The name of the field in `package.json` that contains the exports
 */
export const EXPORTS_FIELD = 'exports';

/**
 * The name of the `default` export in a conditional export
 */
export const CONDITIONAL_EXPORT_DEFAULT = 'default';

/**
 * The name of the `import` export in a conditional export
 */
export const CONDITIONAL_EXPORT_REQUIRE = 'require';

/**
 * The name of the `require` export in a conditional export
 */
export const CONDITIONAL_EXPORT_IMPORT = 'import';

/**
 * The name of the `types` export in a conditional export
 */
export const CONDITIONAL_EXPORT_TYPES = 'types';

type Exports = PackageJson.Exports;

type ExportConditions = PackageJson.ExportConditions;

/**
 * An string array representing a deeply-nested value within an object (i.e. a
 * _keypath_).
 */
export type Keypath = Opaque<string[], 'Keypath'>;

/**
 * Returns `true` if the `package.json` contains `type: module`
 *
 * @param pkgJson A `package.json` object
 * @returns `true` if the `package.json` contains `type: module`
 */
export function isESMPkg(pkgJson: PackageJson) {
  return 'type' in pkgJson && pkgJson.type === 'module';
}

/**
 * Returns `true` if `value` is a string
 *
 * @param value - Value to check
 * @returns `true` if `value` is a string
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Returns `true` if `value` is `null`
 *
 * @param value - Value to check
 * @returns `true` if `value` is `null`
 */
export function isNull(value: any): value is null {
  return value === null;
}

/**
 * Returns `true` if `value` is an `Array`
 *
 * @param value - Value to check
 * @returns `true` if `value` is an `Array`
 */
function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Returns `true` if `value` is an `Object`
 *
 * @param value - Value to check
 * @returns `true` if `value` is an `Object`
 */
function isObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && !isArray(value) && !isNull(value);
}

/**
 * Returns `true` if `value` is `undefined`
 *
 * @param value - Value to check
 * @returns `true` if `value` is `undefined`
 */
function isUndefined(value: any): value is undefined {
  return value === undefined;
}

/**
 * Returns `true` if `value` is a {@link ExportConditions} object
 *
 * @param exportsValue - Value of the `exports` field in `package.json`
 * @returns `true` if `value` is a {@link ExportConditions} object
 */
export function isExportConditions(
  exportsValue?: Exports,
): exportsValue is ExportConditions {
  return typeOf(exportsValue) === 'object';
}

/**
 * For `switch` statements, until JS gets proper matching
 *
 * @param value - Value to check
 * @returns A string representing the type of `value`
 */
export function typeOf(
  value: any,
): 'string' | 'null' | 'undefined' | 'object' | 'array' | 'unknown' {
  if (isString(value)) {
    return 'string';
  } else if (isNull(value)) {
    return 'null';
  } else if (isArray(value)) {
    return 'array';
  } else if (isObject(value)) {
    return 'object';
  } else if (isUndefined(value)) {
    return 'undefined';
  } else {
    /* istanbul ignore next */
    return 'unknown';
  }
}

export class ExportsInspector<Schema extends Rule.RuleDefSchemaValue> {
  protected taskQueue: Promise<void>[];

  constructor(
    private readonly ctx: Readonly<Rule.RuleContext>,
    private readonly opts: Rule.RuleOptions<Schema>,
  ) {
    this.taskQueue = [];
  }

  /**
   * {@inheritdoc CheckContext.addIssue}
   */
  protected get addIssue() {
    return this.ctx.addIssue;
  }

  protected get hasDefaultConditionalExport() {
    return (
      isExportConditions(this.pkgJson[EXPORTS_FIELD]) &&
      CONDITIONAL_EXPORT_DEFAULT in this.pkgJson[EXPORTS_FIELD]
    );
  }

  /**
   * {@inheritdoc CheckContext.pkgJson}
   */
  protected get pkgJson(): PackageJson {
    return this.ctx.pkgJson;
  }

  /**
   * {@inheritdoc CheckContext.installPath}
   */
  protected get installPath() {
    return this.ctx.installPath;
  }

  protected get shouldAllowGlobs() {
    return this.opts.glob !== false;
  }

  protected get shouldCheckImportConditional() {
    return Boolean(this.opts.import);
  }

  protected get shouldCheckOrder() {
    return Boolean(this.opts.order);
  }

  protected get shouldCheckRequireConditional() {
    return Boolean(this.opts.require);
  }

  protected get shouldCheckTypesConditional() {
    return Boolean(this.opts.types);
  }

  protected get exportsValue(): PackageJson.Exports | undefined {
    return this.pkgJson[EXPORTS_FIELD];
  }

  protected checkDefaultConditional(
    value: ExportConditions,
    keypath: Keypath = [CONDITIONAL_EXPORT_DEFAULT] as Keypath,
  ) {
    if (this.isDefaultConditionalNotLast(value)) {
      const fullName = ExportsInspector.keypathToString(keypath);
      this.addIssue(`Conditional ${fullName} must be the last export`);
    }
  }

  /**
   * Runs checks on a single file or glob pattern referenced in the `exports`
   * field.
   *
   * Checks (in roughly this order):
   *
   * 1. If `relPath` is `null` (do nothing)
   * 2. If `relPath` is an empty string
   * 3. If `relPath` is a glob pattern and globs are not allowed
   * 4. If `relPath` is a glob pattern and matches no files
   * 5. If `relPath` is missing or un-`stat`-able
   * 6. If `key` is conditional `require` and `relPath` is not a script
   * 7. If `key` is conditional `import` and `relPath` is not a module
   * 8. If `key` is conditional `types` and `relPath` is not a `.d.ts` file
   *
   * @remarks
   * The `types` check is not in the TypeScript plugin because it is common for
   * packages which do not otherwise use TypeScript, but provide a declaration.
   * @param relPath - Relative path of file from the package root. In a subpath
   *   export, this is the "value".
   * @param keypath - Keypath for display purposes
   */
  protected async checkFile(
    relPath: string | null,
    keypath: Keypath,
  ): Promise<void> {
    // this just means "do not export this"
    if (isNull(relPath)) {
      return;
    }

    const fullName = ExportsInspector.keypathToString(keypath);

    // seems wrong to have an empty string for a path!
    if (isString(relPath) && !relPath) {
      this.addIssue(`Export ${fullName} contains an empty string`);
      return;
    }

    // use glob only if there's a glob pattern.  premature optimization?
    if (this.isGlobPattern(relPath)) {
      debug('Checking export %s as glob', relPath);

      if (!this.shouldAllowGlobs) {
        this.addIssue(`Export ${fullName} contains a glob pattern`);
        return;
      }

      if (await this.globPatternMatchesNothing(relPath)) {
        this.addIssue(
          `Export ${fullName} matches no files using glob: ${relPath}`,
        );
      }

      return;
    }

    const absPath = path.resolve(this.installPath, relPath);

    debug('Checking export %s', relPath);

    const missing = await this.isFileMissing(absPath);
    if (missing) {
      this.addIssue(`Export ${fullName} unreadable at path: ${relPath}`);
      return;
    }

    const key = keypath[keypath.length - 1];

    switch (key) {
      case CONDITIONAL_EXPORT_IMPORT: {
        if (await this.conditionalExportIsNotModule(absPath)) {
          this.addIssue(
            `Expected ${fullName} to be an ESM module at path: ${relPath}`,
          );
        }
        break;
      }
      case CONDITIONAL_EXPORT_REQUIRE: {
        if (await this.conditionalExportIsNotScript(absPath)) {
          this.addIssue(
            `Expected ${fullName} to be a CJS script at path: ${relPath}`,
          );
        }
        break;
      }
      case CONDITIONAL_EXPORT_TYPES: {
        if (this.conditionalExportIsNotTsDeclaration(absPath)) {
          this.addIssue(
            `Expected ${fullName} to be a .d.ts file at path: ${relPath}`,
          );
        }
        break;
      }
    }
  }

  protected checkNullExportsField() {
    this.addIssue(`${EXPORTS_FIELD} field cannot be null`);
  }

  protected checkUndefinedExportsField() {
    if (isESMPkg(this.pkgJson)) {
      this.addIssue(`${EXPORTS_FIELD} field not found in ESM package`);
    }
  }

  protected async conditionalExportIsNotModule(filepath: string) {
    return this.shouldCheckImportConditional && (await this.isScript(filepath));
  }

  protected async conditionalExportIsNotScript(filepath: string) {
    return (
      this.shouldCheckRequireConditional && (await this.isModule(filepath))
    );
  }

  protected conditionalExportIsNotTsDeclaration(filepath: string) {
    return this.shouldCheckTypesConditional && !filepath.endsWith('.d.ts');
  }

  protected async globPatternMatchesNothing(pattern: string) {
    const matchingFiles = await glob(pattern, {
      cwd: this.installPath,
    });

    // it's _possible_, but unlikely that we'd have an unreadable file,
    // so don't bother statting or checking readability
    return matchingFiles.length === 0;
  }

  public async inspect() {
    try {
      this.traverseExports(this.exportsValue);
      await Promise.all(this.taskQueue);
    } finally {
      this.taskQueue = [];
    }
  }

  /**
   * If {@link exportsValue} is a {@link ExportConditions} and contains a
   * `default` prop, return `true` if said key is _not_ the last key in the
   * object
   */
  public isDefaultConditionalNotLast(value: ExportConditions) {
    if (this.shouldCheckOrder && this.hasDefaultConditionalExport) {
      // as of ES2020 this should be stable.
      const keys = Object.keys(value);

      if (keys[keys.length - 1] !== CONDITIONAL_EXPORT_DEFAULT) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns `true` if `filepath` is missing or unreadable
   *
   * @remarks
   * This might want to be a call to {@link fs.access} instead.
   * @returns `true` if `filepath` is missing or unreadable
   */
  public async isFileMissing(filepath: string) {
    try {
      await fs.stat(filepath);
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Checks if the given string is a glob pattern.
   *
   * @param allegedPattern - The string to check.
   * @returns `true` if the string is a glob pattern; `false` otherwise.
   */
  public isGlobPattern(allegedPattern: string) {
    return glob.hasMagic(allegedPattern, {magicalBraces: true});
  }

  /**
   * Checks if the given file is an ES module.
   *
   * @param filepath - The path to the file to check.
   * @returns A promise that resolves to `true` if the file is an ES module;
   *   `false` otherwise.
   */
  public async isModule(filepath: string): Promise<boolean> {
    return (await isESMFile(filepath)).esm;
  }

  /**
   * Checks if the given file is a CommonJS script (i.e., not an ES module).
   *
   * @param filepath - The path to the file to check.
   * @returns A promise that resolves to `true` if the file is a CommonJS
   *   script; `false` otherwise.
   */
  public async isScript(filepath: string): Promise<boolean> {
    return !(await this.isModule(filepath));
  }

  /**
   * Recursive function which enqueues async checks of the `exports` field in
   * `package.json`
   *
   * This function is only async so we can recursively enqueue calls to it.
   */
  protected traverseExports(
    exportsValue?: Exports,
    keypath: Keypath = [EXPORTS_FIELD] as Keypath,
  ) {
    switch (typeOf(exportsValue)) {
      case 'undefined': {
        this.enqueueTask(this.checkUndefinedExportsField);
        break;
      }

      case 'null': {
        this.enqueueTask(this.checkNullExportsField);
        break;
      }

      case 'string': {
        this.enqueueTask(this.checkFile, exportsValue as string, keypath);
        break;
      }

      case 'array': {
        (exportsValue as string[]).forEach((value, idx) => {
          this.traverseExports(value, [...keypath, `[${idx}]`] as Keypath);
        });
        break;
      }

      case 'object': {
        const exportConditions = exportsValue as ExportConditions;
        this.enqueueTask(this.checkDefaultConditional, exportConditions, [
          ...keypath,
          CONDITIONAL_EXPORT_DEFAULT,
        ] as Keypath);
        Object.entries(exportConditions).forEach(([topLvlKey, topLvlValue]) => {
          this.traverseExports(topLvlValue, [...keypath, topLvlKey] as Keypath);
        });
        break;
      }

      case 'unknown': {
        this.addIssue(
          `${ExportsInspector.keypathToString(
            keypath,
          )} is an unexpected type: ${exportsValue}`,
        );
        break;
      }
    }
  }

  /**
   * Enqueues a method call to the task queue.
   *
   * Should not block, even if the method is sync.
   *
   * @param task - Function to call
   * @param args - Args for the function
   */
  protected enqueueTask<TArgs extends readonly any[]>(
    task: (this: this, ...args: TArgs) => Promise<void> | void,
    ...args: TArgs
  ) {
    // defending myself from my future me
    /* istanbul ignore next */
    if ((task as any) === ExportsInspector.prototype.traverseExports) {
      throw new TypeError('traverseExports must be run synchronously');
    }
    this.taskQueue.push(Promise.resolve().then(() => task.call(this, ...args)));
  }

  /**
   * Converts a keypath array to a string for display purposes
   */
  protected static keypathToString(this: void, keypath: Keypath) {
    return `<${keypath.join(' » ')}>`;
  }
}
