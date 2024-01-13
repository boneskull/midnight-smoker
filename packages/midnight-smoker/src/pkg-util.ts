import {memoize} from 'lodash';
import readPkgUp from 'read-pkg-up';
import type {PackageJson} from 'type-fest';
import {fromUnknownError} from './error/base-error';
import {
  MissingPackageJsonError,
  UnreadablePackageJsonError,
} from './error/util-error';

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
 * Reads `midnight-smoker`'s `package.json`
 */
export async function readSmokerPkgJson(): Promise<PackageJson> {
  return (await readPackageJson({cwd: __dirname, strict: true})).packageJson;
}
