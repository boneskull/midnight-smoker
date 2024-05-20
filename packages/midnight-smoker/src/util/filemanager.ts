import {MIDNIGHT_SMOKER, PACKAGE_JSON, UNKNOWN_TMPDIR_PREFIX} from '#constants';
import {DirCreationError} from '#error/create-dir-error';
import {fromUnknownError} from '#error/from-unknown-error';
import {MissingPackageJsonError} from '#error/missing-pkg-json-error';
import {UnreadablePackageJsonError} from '#error/unreadable-pkg-json-error';
import Debug from 'debug';
import type nodeFsPromises from 'node:fs/promises';
import path from 'node:path';
import normalizePkgData from 'normalize-package-data';
import {type PackageJson} from 'type-fest';
import {justImport, resolveFrom} from './loader-util';
import {uniqueId, type UniqueId} from './unique-id';
import {memoize} from './util';

const debug = Debug('midnight-smoker:filemanager');

export type FsApi = {
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

export interface FileManagerOpts {
  fs?: FsApi;
  tmpdir?: GetTempDirRoot;

  importer?: Importer;

  resolver?: Resolver;
}

export type Importer = (specifier: string | URL) => Promise<unknown>;

export type Resolver = (specifier: string | URL, from?: string | URL) => string;

export type NormalizedPackageJson = PackageJson & normalizePkgData.Package;

export type GetTempDirRoot = () => string;

export interface ReadPkgJsonOpts {
  normalize?: boolean;
  strict?: boolean;
}

export interface ReadPkgJsonResult {
  packageJson: PackageJson;
  path: string;
}

export interface ReadPkgJsonNormalizedResult extends ReadPkgJsonResult {
  packageJson: NormalizedPackageJson;
}

export class FileManager {
  public readonly fs: FsApi;

  public readonly getTempDirRoot: GetTempDirRoot;

  public readonly tempDirs: Set<string> = new Set();

  public readonly id: UniqueId;

  #importer: Importer;

  #resolver: Resolver;

  constructor(opts?: FileManagerOpts) {
    this.id = uniqueId({prefix: 'filemanager'});
    const anyOpts = opts ?? ({} as FileManagerOpts);
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    this.fs = anyOpts.fs ?? (require('node:fs') as FsApi);
    this.getTempDirRoot =
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
      anyOpts.tmpdir ?? (require('node:os').tmpdir as GetTempDirRoot);

    this.#importer =
      anyOpts.importer ?? (async (specifier) => justImport(specifier));
    this.#resolver =
      anyOpts.resolver ?? ((specifier, from) => resolveFrom(specifier, from));
  }

  resolve(specifier: string | URL, from?: string | URL): string {
    return this.#resolver(specifier, from);
  }

  /**
   * Creates a temp dir
   *
   * @returns New temp dir path
   * @todo These might want to be named per `PkgManager`.
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
      const tempDir = await this.fs.promises.mkdtemp(fullPrefix);
      this.tempDirs.add(tempDir);
      return tempDir;
    } catch (err) {
      throw new DirCreationError(
        `Failed to create temp directory with prefix ${fullPrefix}`,
        fullPrefix,
        err as NodeJS.ErrnoException,
      );
    }
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

  public async rimraf(dir: string): Promise<void> {
    await this.fs.promises.rm(dir, {recursive: true, force: true});
  }

  public async import(specifier: string | URL) {
    return this.#importer(specifier);
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

  public static create(this: void, opts?: FileManagerOpts): FileManager {
    return new FileManager(opts);
  }

  @memoize()
  public async readSmokerPkgJson() {
    const result = await this.findPkgUp(__dirname, {strict: true});
    return result.packageJson;
  }
}
