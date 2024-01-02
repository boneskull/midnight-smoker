/**
 * Gotta have a "util" module
 *
 * @packageDocumentation
 */

import {isFunction, isObject} from 'lodash';
import {Module} from 'node:module';
import path from 'node:path';
import readPkgUp from 'read-pkg-up';
import type {Opaque, PackageJson} from 'type-fest';
import {
  MissingPackageJsonError,
  UnreadablePackageJsonError,
} from './error/util-error';

/**
 * Regex string to match a package name.
 *
 * Used by {@linkcode PKG_NAME_REGEX} and {@linkcode PKG_NAME_WITH_SPEC_REGEX}.
 */
const PKG_NAME_REGEX_STR =
  '^(@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*';

/**
 * Regex to match a package name without a spec
 */
const PKG_NAME_REGEX = new RegExp(`${PKG_NAME_REGEX_STR}$`);

/**
 * Regex to match a package name with a spec.
 *
 * @remarks
 * This does not attempt to validate a semver string, though it could. If it
 * did, it'd also need to allow any valid package tag. I'm not sure what the
 * latter is, but the former can be found on
 * {@link https://stackoverflow.com/a/72900791|StackOverflow}.
 */
const PKG_NAME_WITH_SPEC_REGEX = new RegExp(`${PKG_NAME_REGEX_STR}@.+$`);

/**
 * Fields in `package.json` that might have a dependency we want to install as
 * an isolated package to help run smoke tests.
 *
 * @remarks
 * Order is important; changing this should be a breaking change
 */
const DEP_FIELDS = [
  'devDependencies',
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/**
 * Try to pick a version for a package to install.
 *
 * Given an `installable` which is both a) a valid npm package name and b) has
 * no version specifier, determine the version to install.
 *
 * If the `package.json` within `cwd` contains the package of the same name, we
 * will use that version; otherwise we will use the `latest` tag. If
 * `installable` is not a package name at all, it passes thru verbatim.
 *
 * @param installable The `thing` in `npm install <thing>`
 * @param cwd Where the command would be run
 */
export async function pickPackageVersion(
  installable: string,
  cwd = process.cwd(),
): Promise<string> {
  if (PKG_NAME_WITH_SPEC_REGEX.test(installable)) {
    // we were given a package name with a version spec. just use it
    return installable;
  }

  if (PKG_NAME_REGEX.test(installable)) {
    // we were given a package name, no version.
    // try to see if it's in the package.json
    const pkgName = installable;

    const {packageJson} = (await readPackageJson({cwd})) ?? {};
    if (packageJson) {
      for (const field of DEP_FIELDS) {
        const deps = packageJson[field];
        if (deps && pkgName in deps) {
          return `${pkgName}@${deps[pkgName]}`;
        }
      }
    }
    return `${pkgName}@latest`;
  }

  // could be a path or url
  return installable;
}

/**
 * Options for {@linkcode readPackageJson}
 */
export interface ReadPackageJsonOpts {
  /**
   * Defaults to `process.cwd()`
   */
  cwd?: string;
  /**
   * Normalize the `package.json`
   */
  normalize?: boolean;
  /**
   * Reject if not found
   */
  strict?: boolean;
}

export type ReadPackageJsonResult = readPkgUp.ReadResult;

export type ReadPackageJsonNormalizedResult = readPkgUp.NormalizedReadResult;

/**
 * Reads closest `package.json` from some dir
 *
 * @param cwd Dir to read from
 * @param Options
 * @returns Object with `packageJson` and `path` properties or `undefined` if
 *   not in `strict` mode
 */
export async function readPackageJson(
  opts: ReadPackageJsonOpts & {strict: true; normalize: true},
): Promise<ReadPackageJsonNormalizedResult>;
export async function readPackageJson(
  opts: ReadPackageJsonOpts & {strict: true},
): Promise<ReadPackageJsonResult>;
export async function readPackageJson(
  opts?: ReadPackageJsonOpts,
): Promise<ReadPackageJsonResult | undefined>;
export async function readPackageJson(
  opts: ReadPackageJsonOpts & {normalize: true; strict?: false},
): Promise<ReadPackageJsonNormalizedResult | undefined>;
export async function readPackageJson(opts: ReadPackageJsonOpts = {}) {
  const {cwd = process.cwd(), normalize = false, strict} = opts;
  const cacheKey = `cwd=${cwd};normalize=${normalize}`;
  if (readPackageJson.cache.has(cacheKey)) {
    return readPackageJson.cache.get(cacheKey)!;
  }
  try {
    const result = await readPkgUp({cwd, normalize});
    if (!result && strict) {
      throw new MissingPackageJsonError(
        `Could not find package.json from ${cwd}`,
        cwd,
      );
    }
    readPackageJson.cache.set(cacheKey, result);
    return result;
  } catch (err) {
    throw new UnreadablePackageJsonError(
      `Could not read package.json from ${cwd}`,
      cwd,
      err as Error,
    );
  }
}

readPackageJson.cache = new Map<
  string,
  readPkgUp.ReadResult | readPkgUp.NormalizedReadResult | undefined
>();

/**
 * Reads closest `package.json` from some dir (synchronously)
 *
 * @remarks
 * Use {@linkcode readPackageJson} instead if possible
 * @param cwd Dir to read from
 * @param Options
 * @returns Object with `packageJson` and `path` properties or `undefined` if
 *   not in `strict` mode
 */
export function readPackageJsonSync(
  opts: ReadPackageJsonOpts & {strict: true},
): readPkgUp.ReadResult;
export function readPackageJsonSync(
  opts?: ReadPackageJsonOpts,
): readPkgUp.ReadResult | undefined;
export function readPackageJsonSync({
  cwd,
  normalize,
  strict,
}: ReadPackageJsonOpts = {}) {
  cwd ??= process.cwd();
  if (readPackageJsonSync.cache.has({cwd, normalize})) {
    return readPackageJsonSync.cache.get({cwd, normalize});
  }
  try {
    const result = readPkgUp.sync({cwd, normalize});
    if (!result && strict) {
      throw new MissingPackageJsonError(
        `Could not find package.json from ${cwd}`,
        cwd,
      );
    }
    readPackageJsonSync.cache.set({cwd, normalize}, result);
    return result;
  } catch (err) {
    throw new UnreadablePackageJsonError(
      `Could not read package.json from ${cwd}`,
      cwd,
      err as Error,
    );
  }
}

readPackageJsonSync.cache = new Map<
  ReadPackageJsonOpts,
  readPkgUp.ReadResult | undefined
>();

let dataDir: string;

export async function findDataDir(): Promise<string> {
  if (dataDir) {
    return dataDir;
  }
  const {path: packagePath} = (await readPackageJson({
    cwd: __dirname,
  }))!;
  const root = path.dirname(packagePath);
  dataDir = path.join(root, 'data');
  return dataDir;
}

/**
 * Resolves module at `moduleId` from `fromDir` dir
 *
 * @param moduleId - Module identifier
 * @param fromDir - Dir to resolve from; defaults to CWD
 * @returns Resolved module path
 */
export function resolveFrom(moduleId: string, fromDir = process.cwd()): string {
  return Module.createRequire(path.join(fromDir, 'index.js')).resolve(moduleId);
}

/**
 * Resolves module at `moduleId` from `fromDir` dir
 *
 * @param moduleId - Module identifier
 * @param fromDir - Dir to resolve from; defaults to CWD
 * @returns Resolved module path
 */
export function requireFrom(
  moduleId: string,
  fromDir = process.cwd(),
): unknown {
  return Module.createRequire(path.join(fromDir, 'index.js'))(moduleId);
}

/**
 * A branded string referring to a unique identifier.
 */
export type UniqueId = Opaque<string, 'UniqueId'>;

/**
 * A function which generates a {@link UniqueId}
 */
export type UniqueIdFactory = () => UniqueId;

/**
 * Returns a {@link UniqueIdFactory}, which generates a unique ID each time it is
 * called.
 *
 * @param prefix - A prefix to prepend to each ID
 * @returns The unique ID factory, which makes this function factory factory.
 */
export function uniqueIdFactoryFactory(prefix = ''): UniqueIdFactory {
  let nextId = 0;

  return function generateId(): UniqueId {
    return `${prefix}${nextId++}` as UniqueId;
  };
}

/**
 * Cached `package.json` for this package.
 */
let cachedPkgJson: PackageJson | undefined;

/**
 * Reads the `package.json` in this package.
 *
 * Used to surface some information (`version`, `homepage`, etc.) to user.
 */
export async function readSmokerPkgJson(): Promise<PackageJson> {
  if (cachedPkgJson) {
    return cachedPkgJson;
  }
  const {packageJson: pkgJson} = await readPackageJson({
    cwd: __dirname,
    strict: true,
  });
  cachedPkgJson = pkgJson;
  return pkgJson;
}

function isSerializable<T>(value: T): value is T & {toJSON: () => unknown} {
  return isObject(value) && 'toJSON' in value && isFunction(value.toJSON);
}

/**
 * Serializes a value to JSON-able if it is serializable.
 *
 * This should be used where we have a `ThingOne` and a `ThingTwo implements
 * ThingOne` and `ThingTwo.toJSON()` returns a `ThingOne`, and we want the
 * `ThingOne` only. Yes, this is a convention.
 *
 * @param value - The value to be serialized.
 * @returns The serialized value if it is serializable, otherwise the original
 *   value.
 */
export function serialize<T>(value: T) {
  const serializableValue = value as T & {toJSON: () => T};
  if (isSerializable(value)) {
    return serializableValue.toJSON();
  }
  return value;
}

/**
 * Type guard for a CJS module with an `__esModule` property
 *
 * @param value - Any value
 * @returns `true` if the value is an object with an `__esModule` property
 */
export function isErsatzESModule(value: unknown): value is {__esModule: true} {
  return isObject(value) && '__esModule' in value;
}

/**
 * Attempts to gracefully load an unknown module.
 *
 * `await import()` on a CJS module will always return an object with a
 * `default` export. Modules which have been, say, compiled with TS into CJS and
 * _also_ have a default export will be wrapped in _another_ `default` property.
 * That sucks, but it can be avoided by just `require`-ing the CJS module
 * instead. We will still need to unwrap the `default` property if it exists.
 *
 * The `pkgJson` parameter is used to help us guess at the type of module we're
 * importing.
 *
 * @param moduleId - Resolved module identifier
 * @param pkgJson - `package.json` associated with the module, if any
 * @returns Hopefully, whatever is exported
 */
export async function justImport(moduleId: string, pkgJson?: PackageJson) {
  // no zalgo here
  await Promise.resolve();
  if (!path.isAbsolute(moduleId)) {
    // TODO throw SmokeError
    throw new TypeError('moduleId must be resolved');
  }
  const maybeIsScript =
    pkgJson?.type !== 'module' || path.extname(moduleId) === '.cjs';

  let raw: unknown;
  if (maybeIsScript) {
    try {
      raw = require(moduleId);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ERR_REQUIRE_ESM') {
        throw err;
      }
    }
  }
  raw ??= await import(moduleId);
  // this catches the case where we `await import()`ed a CJS module despite our best efforts
  if (isErsatzESModule(raw) && 'default' in raw) {
    ({default: raw} = raw);
  }
  return raw;
}
