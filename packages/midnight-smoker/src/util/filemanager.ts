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

import {type FsCapabilities, type OsCapabilties} from '#capabilities';
import {DEFAULT_TMPDIR_PREFIX, MIDNIGHT_SMOKER, PACKAGE_JSON} from '#constants';
import {AbortError} from '#error/abort-error';
import {MissingPackageJsonError} from '#error/missing-pkg-json-error';
import {UnreadablePackageJsonError} from '#error/unreadable-pkg-json-error';
import {type NormalizedPackageJson} from '#schema/package-json';
import {
  type FileManagerOptions,
  type FindPkgJsonResult,
  type ReadPkgJsonNormalizedResult,
  type ReadPkgJsonNormalizeOptions,
  type ReadPkgJsonOptions,
  type ReadPkgJsonStrictOptions,
} from '#util/fs-api';
import {
  glob,
  globIterate,
  type GlobOptions,
  type GlobOptionsWithFileTypesFalse,
  type GlobOptionsWithFileTypesTrue,
  type GlobOptionsWithFileTypesUnset,
  type Path,
} from 'glob';
import path from 'node:path';
import normalizePkgData from 'normalize-package-data';
import {type PackageJson} from 'type-fest';

import {createDebug} from './debug';
import {memoize} from './decorator';
import {fromUnknownError} from './error-util';
import {isSmokerError} from './guard/smoker-error';

export type ReadPkgJsonResult<T> = {
  packageJson: T;
  rawPackageJson: string;
};

export interface FindUpOptions {
  followSymlinks?: boolean;
  signal?: AbortSignal;
}

export interface ReadSmokerPkgJsonOptions {
  signal?: AbortSignal;
}

export class FileManager {
  public readonly fs: FsCapabilities;

  public readonly os: OsCapabilties;

  public readonly tempDirs: Set<string> = new Set();

  constructor(opts: FileManagerOptions = {}) {
    // TODO: allow partial FsCapabilities
    this.fs = opts.fs ?? (require('node:fs') as FsCapabilities);
    if (opts.os?.homedir && opts.os?.tmpdir) {
      this.os = opts.os as OsCapabilties;
    } else {
      const nodeOs = require('node:os') as OsCapabilties;
      this.os = {homedir: nodeOs.homedir, tmpdir: nodeOs.tmpdir, ...opts.os};
    }
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
    prefix: string = DEFAULT_TMPDIR_PREFIX,
    signal?: AbortSignal,
  ): Promise<string> {
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
    const fullPrefix = path.join(
      this.os.tmpdir.call(null),
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
    options: ReadPkgJsonNormalizeOptions & ReadPkgJsonStrictOptions,
  ): Promise<ReadPkgJsonNormalizedResult>;

  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonNormalizeOptions,
  ): Promise<ReadPkgJsonNormalizedResult | undefined>;

  public async findPkgUp(
    cwd: string,
    options: ReadPkgJsonStrictOptions,
  ): Promise<FindPkgJsonResult>;
  public async findPkgUp(
    cwd: string,
    options?: ReadPkgJsonOptions,
  ): Promise<FindPkgJsonResult | undefined>;
  @memoize((cwd, opts) => JSON.stringify({cwd, opts}))
  public async findPkgUp(
    cwd: string,
    {normalize, signal, strict}: ReadPkgJsonOptions = {},
  ): Promise<FindPkgJsonResult | ReadPkgJsonNormalizedResult | undefined> {
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
    if (normalize) {
      const {packageJson, rawPackageJson} = await this.readPkgJson(filepath, {
        normalize: true,
        signal,
      });
      return {
        packageJson,
        path: filepath,
        rawPackageJson,
      };
    }
    const {packageJson, rawPackageJson} = await this.readPkgJson(filepath, {
      signal,
    });
    return {
      packageJson,
      path: filepath,
      rawPackageJson,
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

  public getHomeDir(): string {
    return this.os.homedir();
  }

  public getTmpDir(): string {
    return this.os.tmpdir();
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
      | GlobOptions
      | GlobOptionsWithFileTypesFalse
      | GlobOptionsWithFileTypesTrue
      | GlobOptionsWithFileTypesUnset = {},
  ): AsyncGenerator<Path | string, void, void> {
    return globIterate(pattern, {...options, fs: this.fs});
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
    options: {normalize: true} & ReadPkgJsonOptions,
  ): Promise<ReadPkgJsonResult<NormalizedPackageJson>>;
  public async readPkgJson(
    filepath: string,
    options: {normalize?: false} & ReadPkgJsonOptions,
  ): Promise<ReadPkgJsonResult<PackageJson>>;
  public async readPkgJson(
    filepath: string,
    options?: ReadPkgJsonOptions,
  ): Promise<ReadPkgJsonResult<NormalizedPackageJson | PackageJson>>;
  @memoize((filepath, opts) => JSON.stringify({filepath, opts}))
  public async readPkgJson(
    filepath: string,
    options: ReadPkgJsonOptions = {},
  ): Promise<ReadPkgJsonResult<NormalizedPackageJson | PackageJson>> {
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
        return {
          packageJson: packageJson as NormalizedPackageJson,
          rawPackageJson: file,
        };
      }
      debug('Read JSON at %s', filepath);
      return {packageJson, rawPackageJson: file};
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
    const result = await this.findPkgUp(__dirname, {signal, strict: true});
    return result.packageJson;
  }

  public async rimraf(dir: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new AbortError(signal.reason);
    }
    await this.fs.promises.rm(dir, {force: true, recursive: true});
  }
}

const debug = createDebug(__filename);
