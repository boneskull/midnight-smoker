import Debug from 'debug';
import {memoize} from 'lodash';
import childProcess from 'node:child_process';
import {promisify} from 'node:util';
import readPkgUp from 'read-pkg-up';
import type {PackageJson} from 'type-fest';
import {DEFAULT_PKG_MANAGER_VERSION} from './constants';
import {fromUnknownError} from './error/base-error';
import {
  MissingPackageJsonError,
  UnreadablePackageJsonError,
} from './error/util-error';

const debug = Debug('midnight-smoker:pkg-util');
const execFile = promisify(childProcess.execFile);

/**
 * Options for {@link readPackageJson}
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

const _readPkgJson = memoize(
  /**
   * @param cwd Current working directory
   * @param normalize If `true`, normalize the resulting `package.json` file
   * @param strict If `true`, throw if unable to find a `package.json` file
   * @returns `package.json` and path thereof
   */
  async (
    cwd: string = process.cwd(),
    normalize?: boolean,
    strict?: boolean,
  ) => {
    let result: readPkgUp.ReadResult | undefined;
    try {
      result = await readPkgUp({cwd, normalize});
    } catch (err) {
      throw new UnreadablePackageJsonError(
        `Could not read package.json from ${cwd}`,
        cwd,
        fromUnknownError(err),
      );
    }
    if (!result && strict) {
      throw new MissingPackageJsonError(
        `Could not find package.json from ${cwd}`,
        cwd,
      );
    }
    return result;
  },
);

/**
 * Reads closest `package.json` from some dir
 *
 * @param opts Options
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
export async function readPackageJson({
  cwd,
  normalize,
  strict,
}: ReadPackageJsonOpts = {}) {
  return _readPkgJson(cwd, normalize, strict);
}

/**
 * Resets the memoization cache for {@link readPackageJson}
 */
readPackageJson.resetCache = () => {
  _readPkgJson.cache = new Map();
};

const _readPkgJsonSync = memoize(
  (cwd: string = process.cwd(), normalize?: boolean, strict?: boolean) => {
    let result: readPkgUp.ReadResult | undefined;
    try {
      result = readPkgUp.sync({cwd, normalize});
    } catch (err) {
      throw new UnreadablePackageJsonError(
        `Could not read package.json from ${cwd}`,
        cwd,
        fromUnknownError(err),
      );
    }
    if (!result && strict) {
      throw new MissingPackageJsonError(
        `Could not find package.json from ${cwd}`,
        cwd,
      );
    }
    return result;
  },
);

/**
 * Reads closest `package.json` from some dir (synchronously)
 *
 * @remarks
 * Use {@link readPackageJson} instead if possible
 * @param options Options
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
  return _readPkgJsonSync(cwd, normalize, strict);
}

/**
 * Resets the memoization cache for {@link readPackageJsonSync}
 */
readPackageJsonSync.resetCache = () => {
  _readPkgJsonSync.cache = new Map();
};

/**
 * Reads `midnight-smoker`'s own `package.json`
 *
 * @remarks
 * We cannot read it directly because it's outside of TS' `rootDir`. If we were
 * to change the `rootDir`, then the path would be wrong at runtime.
 */
export async function readSmokerPkgJson(): Promise<PackageJson> {
  return (await readPackageJson({cwd: __dirname, strict: true})).packageJson;
}

/**
 * Queries a package manager executable for its version
 *
 * @param bin Package manager executable; defined in a {@link PkgManagerDef}
 * @returns Version string
 */
async function _getSystemPkgManagerVersion(bin: string): Promise<string> {
  try {
    const {stdout} = await execFile(bin, ['--version']);
    return stdout.trim();
  } catch {
    debug('Failed to get version for %s', bin);
    return DEFAULT_PKG_MANAGER_VERSION;
  }
}

/**
 * Queries a package manager executable for its version
 *
 * @param bin Package manager executable; defined in a {@link PkgManagerDef}
 * @returns Version string
 */
export const getSystemPkgManagerVersion = memoize(_getSystemPkgManagerVersion);

/**
 * Regex string to match a package name.
 *
 * Used by {@link PKG_NAME_REGEX} and {@link PKG_NAME_WITH_SPEC_REGEX}.
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
