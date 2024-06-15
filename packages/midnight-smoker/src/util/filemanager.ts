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
import {AbortError} from '#error/abort-error';
import {MissingPackageJsonError} from '#error/missing-pkg-json-error';
import {UnreadablePackageJsonError} from '#error/unreadable-pkg-json-error';
import {isSmokerError} from '#util/error-util';
import {
  type FileManagerOptions,
  type FsApi,
  type GetHomeDir,
  type GetTempDirRoot,
  type NormalizedPackageJson,
  type ReadPkgJsonNormalizedResult,
  type ReadPkgJsonOptions,
  type ReadPkgJsonResult,
} from '#util/fs-api';
import {memoize} from '#util/util';
import Debug from 'debug';
import {
  glob,
  globIterate,
  type GlobOptions,
  type GlobOptionsWithFileTypesFalse,
  type GlobOptionsWithFileTypesTrue,
  type GlobOptionsWithFileTypesUnset,
  type Path,
} from 'glob';
import type os from 'node:os';
import path from 'node:path';
import normalizePkgData from 'normalize-package-data';
import {type PackageJson} from 'type-fest';
import {fromUnknownError} from './error-util';

export interface FindUpOptions {
  followSymlinks?: boolean;
  signal?: AbortSignal;
}

export interface ReadSmokerPkgJsonOptions {
  signal?: AbortSignal;
}

export class FileManager {
  public readonly fs: FsApi;

  public readonly getHomeDir: GetHomeDir;

  public readonly getTempDirRoot: GetTempDirRoot;

  public readonly tempDirs: Set<string> = new Set();

  constructor(opts?: FileManagerOptions) {
    const anyOpts = opts ?? ({} as FileManagerOptions);
    this.fs = anyOpts.fs ?? (require('node:fs') as FsApi);
    this.getHomeDir =
      anyOpts.homedir ??
      ((require('node:os') as typeof os).homedir as GetHomeDir);
    this.getTempDirRoot =
      anyOpts.tmpdir ??
      ((require('node:os') as typeof os).tmpdir as GetTempDirRoot);
  }

  public static create(this: void, opts?: FileManagerOptions): FileManager {
    return new FileManager(opts);
  }

  /**
   * Creates a temp dir
   *
   * @returns New temp dir path
   */
  public async createTempDir(
    prefix: string = UNKNOWN_TMPDIR_PREFIX,
    signal?: AbortSignal,
  ): Promise<string> {
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
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
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
    const tempDir = await this.fs.promises.mkdtemp(fullPrefix);
    this.tempDirs.add(tempDir);
    return tempDir;
  }

  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonOptions & {normalize: true; strict: true},
  ): Promise<ReadPkgJsonNormalizedResult>;
  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonOptions & {normalize: true},
  ): Promise<ReadPkgJsonNormalizedResult | undefined>;
  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonOptions & {strict: true},
  ): Promise<ReadPkgJsonResult | ReadPkgJsonNormalizedResult>;
  public async findPkgUp(
    cwd: string,
    options?: ReadPkgJsonOptions,
  ): Promise<ReadPkgJsonResult | ReadPkgJsonNormalizedResult | undefined>;
  @memoize((cwd, opts) => JSON.stringify({cwd, opts}))
  public async findPkgUp(
    cwd: string,
    {strict, signal, normalize}: ReadPkgJsonOptions = {},
  ): Promise<ReadPkgJsonResult | ReadPkgJsonNormalizedResult | undefined> {
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
    const filepath = await this.findUp(PACKAGE_JSON, cwd, {signal});
    if (!filepath) {
      if (strict) {
        debug('Could not find %s from %s', PACKAGE_JSON, cwd);
        throw new MissingPackageJsonError(
          `Could not find ${PACKAGE_JSON} from ${cwd}`,
          cwd,
        );
      }
      return;
    }
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
    const pkgJson = await (normalize
      ? this.readPkgJson(filepath, {normalize: true, signal})
      : this.readPkgJson(filepath, {signal}));
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
    {followSymlinks, signal}: FindUpOptions = {},
  ): Promise<string | undefined> {
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
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

  public globIterate(
    pattern: string | string[],
    options?: GlobOptionsWithFileTypesUnset | undefined,
  ): AsyncGenerator<string, void, void>;
  public globIterate(
    pattern: string | string[],
    options: GlobOptionsWithFileTypesTrue,
  ): AsyncGenerator<Path, void, void>;
  public globIterate(
    pattern: string | string[],
    options: GlobOptionsWithFileTypesFalse,
  ): AsyncGenerator<string, void, void>;
  public globIterate(
    pattern: string | string[],
    options: GlobOptions,
  ): AsyncGenerator<Path, void, void> | AsyncGenerator<string, void, void>;
  public globIterate(
    pattern: string | string[],
    options:
      | GlobOptionsWithFileTypesFalse
      | GlobOptionsWithFileTypesTrue
      | GlobOptionsWithFileTypesUnset
      | GlobOptions = {},
  ): AsyncGenerator<string | Path, void, void> {
    return globIterate(pattern, {...options, fs: this.fs});
  }

  public async glob(
    patterns: string | string[],
    opts?: GlobOptionsWithFileTypesUnset,
  ): Promise<string[]>;
  public async glob(
    patterns: string | string[],
    opts: GlobOptionsWithFileTypesTrue,
  ): Promise<Path[]>;
  public async glob(
    patterns: string | string[],
    opts: GlobOptionsWithFileTypesFalse,
  ): Promise<string[]>;
  public async glob(
    patterns: string | string[],
    opts: GlobOptions,
  ): Promise<Path[] | string[]>;
  public async glob(
    patterns: string | string[],
    opts?:
      | GlobOptions
      | GlobOptionsWithFileTypesFalse
      | GlobOptionsWithFileTypesTrue
      | GlobOptionsWithFileTypesUnset,
  ): Promise<Path[] | string[]> {
    const {fs} = this;
    return opts
      ? glob(patterns, {
          ...opts,
          fs,
        })
      : glob(patterns, {
          fs,
        });
  }

  public async pruneTempDir(dir: string, signal?: AbortSignal): Promise<void> {
    if (!this.tempDirs.has(dir)) {
      debug('Refusing to prune unknown dir %s', dir);
      return;
    }
    try {
      await this.rimraf(dir, signal);
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

  public async readPkgJson(
    filepath: string,
    options: ReadPkgJsonOptions & {normalize: true},
  ): Promise<NormalizedPackageJson>;
  public async readPkgJson(
    filepath: string,
    options: ReadPkgJsonOptions & {normalize: false},
  ): Promise<PackageJson>;
  public async readPkgJson(
    filepath: string,
    options?: ReadPkgJsonOptions,
  ): Promise<PackageJson | NormalizedPackageJson>;
  @memoize((filepath, opts) => JSON.stringify({filepath, opts}))
  public async readPkgJson(
    filepath: string,
    options: ReadPkgJsonOptions = {},
  ): Promise<PackageJson | NormalizedPackageJson> {
    const {normalize, signal} = options;
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
    try {
      const file = await this.fs.promises.readFile(filepath, {
        encoding: 'utf8',
        signal,
      });
      const packageJson = JSON.parse(file) as PackageJson;
      if (normalize) {
        normalizePkgData(packageJson);
        debug('Read & normalized JSON at %s', filepath);
        return packageJson as NormalizedPackageJson;
      }
      debug('Read JSON at %s', filepath);
      return packageJson;
    } catch (err) {
      if (isSmokerError(AbortError, err)) {
        throw err;
      }
      throw new UnreadablePackageJsonError(
        `Could not read ${filepath}`,
        path.dirname(filepath),
        fromUnknownError(err),
      );
    }
  }

  @memoize()
  public async readSmokerPkgJson({
    signal,
  }: ReadSmokerPkgJsonOptions = {}): Promise<PackageJson> {
    const result = await this.findPkgUp(__dirname, {strict: true, signal});
    return result.packageJson;
  }

  public async rimraf(dir: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
    await this.fs.promises.rm(dir, {recursive: true, force: true});
  }
}

const debug = Debug('midnight-smoker:filemanager');
