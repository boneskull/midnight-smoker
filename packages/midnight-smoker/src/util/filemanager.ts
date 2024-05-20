/**
 * Provides {@link FileManager}, which is a general-purpose service for
 * interacting with the filesystem at a high level.
 *
 * Its main purpose is to facilitate testing by providing a single point of
 * entry to the filesystem.
 *
 * @packageDocumentation
 * @todo The module loading stuff should probably be moved out of here (as I
 *   write this, I just moved it _in_), as it would take something considerably
 *   more heavyweight to, say, mock-load an ES module from an in-memory
 *   filesystem.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import {MIDNIGHT_SMOKER, PACKAGE_JSON, UNKNOWN_TMPDIR_PREFIX} from '#constants';
import {DirCreationError} from '#error/create-dir-error';
import {fromUnknownError} from '#error/from-unknown-error';
import {MissingPackageJsonError} from '#error/missing-pkg-json-error';
import {UnreadablePackageJsonError} from '#error/unreadable-pkg-json-error';
import Debug from 'debug';
import {isError, isObject} from 'lodash';
import type fs from 'node:fs';
import type nodeFsPromises from 'node:fs/promises';
import Module from 'node:module';
import type os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import normalizePkgData from 'normalize-package-data';
import {type PackageJson} from 'type-fest';
import type TS from 'typescript';
import {isErrnoException} from './error-util';
import {uniqueId, type UniqueId} from './unique-id';
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

export type Importer = (specifier: string | URL) => Promise<unknown>;

export type NormalizedPackageJson = PackageJson & normalizePkgData.Package;

export type Resolver = (specifier: string | URL, from?: string | URL) => string;

export interface FileManagerOpts {
  fs?: FsApi;
  homedir?: GetHomeDir;
  importer?: Importer;
  resolver?: Resolver;
  tmpdir?: GetTempDirRoot;
  ts?: typeof TS;
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
  #importer: Importer;

  #resolver: Resolver;

  public readonly fs: FsApi;

  public readonly getHomeDir: GetHomeDir;

  public readonly getTempDirRoot: GetTempDirRoot;

  public readonly id: UniqueId;

  public readonly tempDirs: Set<string> = new Set();

  public readonly ts?: typeof TS;

  constructor(opts?: FileManagerOpts) {
    this.id = uniqueId({prefix: 'filemanager'});
    const anyOpts = opts ?? ({} as FileManagerOpts);
    this.fs = anyOpts.fs ?? (require('node:fs') as FsApi);
    this.getHomeDir =
      anyOpts.homedir ??
      ((require('node:os') as typeof os).homedir as GetHomeDir);
    this.getTempDirRoot =
      anyOpts.tmpdir ??
      ((require('node:os') as typeof os).tmpdir as GetTempDirRoot);
    this.#importer =
      anyOpts.importer ?? (async (specifier) => this.justImport(specifier));
    this.#resolver =
      anyOpts.resolver ??
      ((specifier, from) => FileManager.resolveFrom(specifier, from));
    this.ts = anyOpts.ts;

    if (!this.ts) {
      try {
        this.ts = require('typescript') as typeof TS;
      } catch {}
    }
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
   * Resolves module at `moduleId` from `fromDir` dir
   *
   * @param moduleId - Module identifier
   * @param fromDir - Dir to resolve from; defaults to CWD
   * @returns Resolved module path
   */
  public static resolveFrom(
    moduleId: string | URL,
    fromDir: string | URL = process.cwd(),
  ): string {
    if (moduleId instanceof URL) {
      moduleId = fileURLToPath(moduleId);
    }
    if (fromDir instanceof URL) {
      fromDir = fileURLToPath(fromDir);
    }
    return Module.createRequire(path.join(fromDir, 'index.js')).resolve(
      moduleId,
    );
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

  public async import(specifier: string | URL) {
    return this.#importer(specifier);
  }

  public async importTs(filepath: string, source?: string) {
    const {ts} = this;
    if (!ts) {
      throw new Error('TypeScript is not available');
    }
    source ??= await this.fs.promises.readFile(filepath, 'utf8');

    const compiledFilepath = `${filepath.slice(0, -2)}mjs`;
    let transpiledContent;
    try {
      try {
        const config = this.resolveTsConfig(path.dirname(filepath)) ?? {};
        config.compilerOptions = {
          ...config.compilerOptions,
          module: ts.ModuleKind.ES2022,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          target: ts.ScriptTarget.ES2022,
          noEmit: false,
        };
        transpiledContent = ts.transpileModule(source, config).outputText;
        await this.fs.promises.writeFile(compiledFilepath, transpiledContent);
      } catch (err) {
        if (isError(err)) {
          err.message = `TypeScript Error in ${filepath}:\n${err.message}`;
        }
        throw err;
      }
      return await this.import(compiledFilepath);
    } finally {
      await this.rimraf(compiledFilepath);
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
  public async readSmokerPkgJson() {
    const result = await this.findPkgUp(__dirname, {strict: true});
    return result.packageJson;
  }

  public resolve(specifier: string | URL, from?: string | URL): string {
    return this.#resolver(specifier, from);
  }

  public async rimraf(dir: string): Promise<void> {
    await this.fs.promises.rm(dir, {recursive: true, force: true});
  }

  /**
   * Attempts to gracefully load an unknown module.
   *
   * `await import()` on a CJS module will always return an object with a
   * `default` export. Modules which have been, say, compiled with TS into CJS
   * and _also_ have a default export will be wrapped in _another_ `default`
   * property. That sucks, but it can be avoided by just `require`-ing the CJS
   * module instead. We will still need to unwrap the `default` property if it
   * exists.
   *
   * The `pkgJson` parameter is used to help us guess at the type of module
   * we're importing.
   *
   * @param moduleId - Resolved module identifier
   * @param pkgJson - `package.json` associated with the module, if any
   * @returns Hopefully, whatever is exported
   */
  private async justImport(moduleId: string | URL, pkgJson?: PackageJson) {
    // no zalgo here
    await Promise.resolve();
    if (moduleId instanceof URL) {
      moduleId = fileURLToPath(moduleId);
    }
    if (!path.isAbsolute(moduleId)) {
      // TODO throw SmokeError
      throw new TypeError('moduleId must be resolved');
    }

    if (path.extname(moduleId).endsWith('ts')) {
      return await this.importTs(moduleId);
    }

    const maybeIsScript =
      pkgJson?.type !== 'module' || path.extname(moduleId) === '.cjs';

    let raw: unknown;
    if (maybeIsScript) {
      try {
        raw = require(moduleId);
      } catch (err) {
        if (isErrnoException(err)) {
          if (err.code !== 'ERR_REQUIRE_ESM') {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }
    raw ??= await import(moduleId);
    // this catches the case where we `await import()`ed a CJS module despite our best efforts
    if (FileManager.isErsatzESModule(raw) && 'default' in raw) {
      ({default: raw} = raw);
    }
    return raw;
  }

  private resolveTsConfig(directory: string): TS.TranspileOptions | undefined {
    const {ts} = this;
    if (!ts) {
      throw new Error('TypeScript is not available');
    }
    const filePath = ts.findConfigFile(directory, (fileName) =>
      this.fs.existsSync(fileName),
    );

    if (filePath !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const {config, error} = ts.readConfigFile(filePath, (path) =>
        this.fs.readFileSync(path, 'utf8'),
      );
      if (error) {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          `Error in ${filePath}: ${error.messageText.toString()}`,
        );
      }
      return config as TS.TranspileOptions;
    }
  }
}

const debug = Debug('midnight-smoker:filemanager');
