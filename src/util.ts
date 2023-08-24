/**
 * Gotta have a "util" module
 * @module
 */
import path from 'node:path';
import readPkgUp, {type ReadResult} from 'read-pkg-up';
import {MissingPackageJsonError, UnreadablePackageJsonError} from './error';

/**
 * Trims all strings in an array and removes empty strings.
 * Returns empty array if input is falsy.
 */
export function normalizeStringArray(value?: string | string[]): string[] {
  return value
    ? castArray(value)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function castArray<T>(value: T | T[]): T[] {
  return (value ? (Array.isArray(value) ? value : [value]) : []).filter(
    Boolean,
  );
}

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
 * @remarks This does not attempt to validate a semver string, though it could.
 * If it did, it'd also need to allow any valid package tag.  I'm not sure what
 * the latter is, but the former can be found on
 * {@link https://stackoverflow.com/a/72900791|StackOverflow}.
 */
const PKG_NAME_WITH_SPEC_REGEX = new RegExp(`${PKG_NAME_REGEX_STR}@.+$`);

/**
 * Fields in `package.json` that might have a dependency we want to install as
 * an isolated package to help run smoke tests.
 *
 * @remarks Order is important; changing this should be a breaking change
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

/**
 * Reads closest `package.json` from some dir
 * @param cwd Dir to read from
 * @param Options
 * @returns Object with `packageJson` and `path` properties or `undefined` if not in `strict` mode
 */
export async function readPackageJson(
  opts: ReadPackageJsonOpts & {strict: true},
): Promise<readPkgUp.ReadResult>;
export async function readPackageJson(
  opts?: ReadPackageJsonOpts,
): Promise<readPkgUp.ReadResult | undefined>;
export async function readPackageJson({
  cwd,
  normalize,
  strict,
}: ReadPackageJsonOpts = {}): Promise<readPkgUp.ReadResult | undefined> {
  cwd ??= process.cwd();
  if (readPackageJson.cache.has({cwd, normalize})) {
    return readPackageJson.cache.get({cwd, normalize});
  }
  try {
    const result = await readPkgUp({cwd, normalize});
    if (!result && strict) {
      throw new MissingPackageJsonError(
        `Could not find package.json from ${cwd}`,
        cwd,
      );
    }
    readPackageJson.cache.set({cwd, normalize}, result);
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
  ReadPackageJsonOpts,
  readPkgUp.ReadResult | undefined
>();

/**
 * Reads closest `package.json` from some dir (synchronously)
 * @param cwd Dir to read from
 * @param Options
 * @returns Object with `packageJson` and `path` properties or `undefined` if not in `strict` mode
 * @remarks Use {@linkcode readPackageJson} instead if possible
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
  })) as ReadResult;
  const root = path.dirname(packagePath);
  dataDir = path.join(root, 'data');
  return dataDir;
}
