/**
 * Provides {@link FileManager}, which is a general-purpose service for
 * interacting with the filesystem at a high level.
 *
 * Its main purpose is to facilitate testing by providing a single point of
 * entry to the filesystem.
 *
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-var-requires */

import {MIDNIGHT_SMOKER, PACKAGE_JSON, UNKNOWN_TMPDIR_PREFIX} from '#constants';
import {fromUnknownError} from '#error/from-unknown-error';
import {MissingPackageJsonError} from '#error/missing-pkg-json-error';
import {UnreadablePackageJsonError} from '#error/unreadable-pkg-json-error';
import Debug from 'debug';
import {isObject} from 'lodash';
import type fs from 'node:fs';
import type nodeFsPromises from 'node:fs/promises';
import type os from 'node:os';
import path from 'node:path';
import normalizePkgData from 'normalize-package-data';
import {type PackageJson} from 'type-fest';
import {memoize} from './util';

export type FsApi = {
  existsSync: typeof fs.existsSync;
  readFileSync: typeof fs.readFileSync;
  promises: Pick<
    typeof nodeFsPromises,
    | 'mkdtemp'
    | 'rm'
    | 'readFile'
    | 'writeFile'
    | 'mkdir'
    | 'readdir'
    | 'stat'
    | 'lstat'
    | 'readlink'
    | 'realpath'
  >;
};

export type GetHomeDir = () => string;

export type GetTempDirRoot = () => string;

export type NormalizedPackageJson = PackageJson & normalizePkgData.Package;

export interface FileManagerOpts {
  fs?: FsApi;
  homedir?: GetHomeDir;
  tmpdir?: GetTempDirRoot;
}

export interface ReadPkgJsonNormalizedResult extends ReadPkgJsonResult {
  packageJson: NormalizedPackageJson;
}

export interface ReadPkgJsonOpts {
  normalize?: boolean;
  strict?: boolean;
}

export interface ReadPkgJsonResult {
  packageJson: PackageJson;
  path: string;
}

export class FileManager {
  public readonly fs: FsApi;

  public readonly getHomeDir: GetHomeDir;

  public readonly getTempDirRoot: GetTempDirRoot;

  public readonly tempDirs: Set<string> = new Set();

  constructor(opts?: FileManagerOpts) {
    const anyOpts = opts ?? ({} as FileManagerOpts);
    this.fs = anyOpts.fs ?? (require('node:fs') as FsApi);
    this.getHomeDir =
      anyOpts.homedir ??
      ((require('node:os') as typeof os).homedir as GetHomeDir);
    this.getTempDirRoot =
      anyOpts.tmpdir ??
      ((require('node:os') as typeof os).tmpdir as GetTempDirRoot);
  }

  public static create(this: void, opts?: FileManagerOpts): FileManager {
    return new FileManager(opts);
  }

  /**
   * Type guard for a CJS module with an `__esModule` property
   *
   * @param value - Any value
   * @returns `true` if the value is an object with an `__esModule` property
   */
  public static isErsatzESModule(value: unknown): value is {__esModule: true} {
    return isObject(value) && '__esModule' in value;
  }

  /**
   * Creates a temp dir
   *
   * @returns New temp dir path
   */
  public async createTempDir(
    prefix: string = UNKNOWN_TMPDIR_PREFIX,
  ): Promise<string> {
    const fullPrefix = path.join(
      this.getTempDirRoot.call(null),
      MIDNIGHT_SMOKER,
      prefix,
      path.sep,
    );
    try {
      // this is only required if we're using an in-memory filesystem
      await this.fs.promises.mkdir(fullPrefix, {recursive: true});
    } catch {}

    const tempDir = await this.fs.promises.mkdtemp(fullPrefix);
    this.tempDirs.add(tempDir);
    return tempDir;
  }

  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonOpts & {normalize: true; strict: true},
  ): Promise<ReadPkgJsonNormalizedResult>;
  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonOpts & {normalize: true},
  ): Promise<ReadPkgJsonNormalizedResult | undefined>;
  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonOpts & {strict: true},
  ): Promise<ReadPkgJsonResult | ReadPkgJsonNormalizedResult>;
  public async findPkgUp(
    cwd: string,
    options?: ReadPkgJsonOpts,
  ): Promise<ReadPkgJsonResult | ReadPkgJsonNormalizedResult | undefined>;
  @memoize((cwd, opts) => JSON.stringify({cwd, opts}))
  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonOpts = {},
  ): Promise<ReadPkgJsonResult | ReadPkgJsonNormalizedResult | undefined> {
    const filepath = await this.findUp(PACKAGE_JSON, cwd);
    if (!filepath) {
      if (options.strict) {
        throw new MissingPackageJsonError(
          `Could not find ${PACKAGE_JSON} from ${cwd}`,
          cwd,
        );
      }
      return;
    }
    const pkgJson = await (options.normalize
      ? this.readPkgJson(filepath, {normalize: true})
      : this.readPkgJson(filepath));
    return {
      packageJson: pkgJson,
      path: filepath,
    };
  }

  /**
   * Find a file in current or ancestor directory
   *
   * @param filename File to find
   * @param from Directory or file to start searching from
   * @param opts Options
   * @returns Path to file, or `undefined` if not found
   */
  public async findUp(
    filename: string,
    from: string,
    {followSymlinks}: {followSymlinks?: boolean} = {},
  ): Promise<string | undefined> {
    const method = followSymlinks ? 'lstat' : 'stat';
    do {
      const allegedPath = path.join(from, filename);
      try {
        const stats = await this.fs.promises[method](allegedPath);
        if (stats.isFile()) {
          return allegedPath;
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw err;
        }
      }
      const nextFrom = path.dirname(from);
      // this happens when you call path.dirname() on the filesystem root
      if (nextFrom === from) {
        break;
      }
      from = nextFrom;
      // eslint-disable-next-line no-constant-condition
    } while (true);
  }

  public async pruneTempDir(dir: string): Promise<void> {
    if (!this.tempDirs.has(dir)) {
      debug('Refusing to prune unknown dir %s', dir);
      return;
    }
    try {
      await this.rimraf(dir);
      this.tempDirs.delete(dir);
    } catch (err) {
      debug('Failed to prune temp dir %s: %s', dir, err);
    }
  }

  /**
   * Reads a file as a string
   *
   * @param filepath File to read
   * @returns File contents
   */
  public async readFile(filepath: string): Promise<string> {
    return this.fs.promises.readFile(filepath, 'utf8');
  }

  public async readPkgJson(filepath: string): Promise<PackageJson>;
  public async readPkgJson(
    filepath: string,
    options: {normalize: true},
  ): Promise<NormalizedPackageJson>;
  @memoize((filepath, opts) => JSON.stringify({filepath, opts}))
  public async readPkgJson(
    filepath: string,
    options: {normalize?: boolean} = {},
  ): Promise<PackageJson | NormalizedPackageJson> {
    try {
      const file = await this.fs.promises.readFile(filepath, 'utf8');
      const relativePath = path.relative(process.cwd(), filepath);
      const packageJson = JSON.parse(file) as PackageJson;
      if (options.normalize) {
        normalizePkgData(packageJson);
        debug('Normalized JSON at %s', relativePath);
        return packageJson as NormalizedPackageJson;
      }
      debug('Read JSON at %s', relativePath);
      return packageJson;
    } catch (err) {
      throw new UnreadablePackageJsonError(
        `Could not read ${filepath}`,
        path.dirname(filepath),
        fromUnknownError(err),
      );
    }
  }

  @memoize()
  public async readSmokerPkgJson(): Promise<PackageJson> {
    const result = await this.findPkgUp(__dirname, {strict: true});
    return result.packageJson;
  }

  public async rimraf(dir: string): Promise<void> {
    await this.fs.promises.rm(dir, {recursive: true, force: true});
  }
}

const debug = Debug('midnight-smoker:filemanager');
