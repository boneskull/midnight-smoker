/**
 * This is a bastardized `lilconfig` with the following changes:
 *
 * 1. All sync methods removed
 * 2. No custom loaders
 * 3. I/O is routed through a {@link FileManager} for ease of testing
 * 4. It's a class now; not a factory function
 * 5. TS support
 * 6. Moved loose util functions into the class as static methods
 * 7. It's smaller than `lilconfig`, but it's also mid.
 *
 * If you want to see the actual call into {@link Midconfig}, see `ConfigReader`
 *
 * @packageDocumentation
 * @see {@link https://npm.im/lilconfig}
 */
import {PACKAGE_JSON} from '#constants';
import {type FileManager} from '#util/filemanager';
import {importTs, justImport} from '#util/loader-util';
import path from 'node:path';
import {type PackageJson} from 'type-fest';
import {
  type AsyncSearcher,
  type Loader,
  type Loaders,
  type MidconfigOptions,
  type MidconfigResult,
} from './midconfig-types';

/**
 * String representing a file without an extension, which is used to map to a
 * {@link Loader}
 */
const NOEXT = 'noExt';

/**
 * Abstracts setting something in a cache. Returns the value set
 *
 * @param c The cache
 * @param filepath The filepath
 * @param res The result
 */
type EmplaceFn = <T>(c: Map<string, T>, filepath: string, res: T) => T;

/**
 * Responsible for loading and searching configuration files.
 */
export class Midconfig implements AsyncSearcher {
  private cache: boolean;

  private emplace: <T>(c: Map<string, T>, filepath: string, res: T) => T;

  private ignoreEmptySearchPlaces: boolean;

  private loadCache = new Map<string, Promise<MidconfigResult>>();

  private loaders: Readonly<Loaders>;

  private packageProp: string | string[];

  private searchCache = new Map<string, Promise<MidconfigResult>>();

  private searchPlaces: string[] | readonly string[];

  private stopDir: string;

  private transform: (result: MidconfigResult) => Promise<MidconfigResult>;

  constructor(
    name: string,
    private readonly fileManager: FileManager,
    options?: MidconfigOptions,
  ) {
    const {
      ignoreEmptySearchPlaces,
      packageProp,
      searchPlaces,
      stopDir,
      transform,
      cache,
    } = this.getOptions(name, options);
    this.emplace = Midconfig.makeEmplace(cache);
    this.ignoreEmptySearchPlaces = ignoreEmptySearchPlaces;

    const jsLoader: Loader = async (_, filename) => justImport(filename);
    const tsLoader: Loader = async (_, filename) => importTs(filename);
    const jsonLoader: Loader = async (_, content) =>
      JSON.parse(content) as unknown;

    this.loaders = Object.freeze({
      '.mjs': jsLoader,
      '.js': jsLoader,
      '.cjs': jsLoader,
      '.ts': tsLoader,
      '.mts': tsLoader,
      '.cts': tsLoader,
      '.json': jsonLoader,
      noExt: jsonLoader,
    });
    this.packageProp = packageProp;
    this.searchPlaces = searchPlaces;
    this.stopDir = stopDir;
    this.transform = transform;
    this.cache = cache;
  }

  public clearCaches() {
    if (this.cache) {
      this.loadCache.clear();
      this.searchCache.clear();
    }
  }

  public clearLoadCache() {
    if (this.cache) this.loadCache.clear();
  }

  public clearSearchCache() {
    if (this.cache) this.searchCache.clear();
  }

  public async load(filepath: string) {
    Midconfig.validateFilePath(filepath);
    const absPath = path.resolve(process.cwd(), filepath);
    if (this.cache && this.loadCache.has(absPath)) {
      return this.loadCache.get(absPath)!;
    }
    const {base, ext} = path.parse(absPath);
    const loaderKey = ext || NOEXT;
    const loader = this.loaders[loaderKey];
    Midconfig.validateLoader(loader, loaderKey);

    // TODO this could go thru FileManager.readPkgJson
    const content = await this.fileManager.readFile(absPath);

    if (base === 'package.json') {
      const pkg = (await loader(absPath, content)) as PackageJson;
      return this.emplace(
        this.loadCache,
        absPath,
        this.transform({
          config: Midconfig.getPackageProp(this.packageProp, pkg),
          filepath: absPath,
        }),
      );
    }

    const result: MidconfigResult = {
      config: null,
      filepath: absPath,
    };
    // handle other type of configs
    const isEmpty = content.trim() === '';
    if (isEmpty && this.ignoreEmptySearchPlaces)
      return this.emplace(
        this.loadCache,
        absPath,
        this.transform({
          config: undefined,
          filepath: absPath,
          isEmpty: true,
        }),
      );

    // cosmiconfig returns undefined for empty files
    result.config = isEmpty ? undefined : await loader(absPath, content);

    return this.emplace(
      this.loadCache,
      absPath,
      this.transform(
        isEmpty ? {...result, isEmpty, config: undefined} : result,
      ),
    );
  }

  public async search(searchFrom = process.cwd()) {
    const result: MidconfigResult = {
      config: null,
      filepath: '',
    };
    const visited: Set<string> = new Set();
    let dir = searchFrom;
    // eslint-disable-next-line no-constant-condition
    dirLoop: while (true) {
      if (this.cache) {
        const r = this.searchCache.get(dir);
        if (r !== undefined) {
          for (const p of visited) this.searchCache.set(p, r);
          return r;
        }
        visited.add(dir);
      }

      for (const searchPlace of this.searchPlaces) {
        const filepath = path.join(dir, searchPlace);
        let content: string;
        try {
          content = await this.fileManager.readFile(filepath);
        } catch {
          continue;
        }
        const loaderKey = path.extname(searchPlace) || NOEXT;
        const loader = this.loaders[loaderKey];

        // handle package.json
        if (searchPlace === PACKAGE_JSON) {
          const pkg = (await loader(filepath, content)) as PackageJson;
          const maybeConfig = Midconfig.getPackageProp(this.packageProp, pkg);
          if (maybeConfig != null) {
            result.config = maybeConfig;
            result.filepath = filepath;
            break dirLoop;
          }

          continue;
        }

        // handle other type of configs
        const isEmpty = content.trim() === '';
        if (isEmpty && this.ignoreEmptySearchPlaces) continue;

        if (isEmpty) {
          result.isEmpty = true;
          result.config = undefined;
        } else {
          Midconfig.validateLoader(loader, loaderKey);
          result.config = await loader(filepath, content);
        }
        result.filepath = filepath;
        break dirLoop;
      }
      if (dir === this.stopDir || dir === Midconfig.parentDir(dir))
        break dirLoop;
      dir = Midconfig.parentDir(dir);
    }

    const transformed =
      // not found
      result.filepath === '' && result.config === null
        ? this.transform(null)
        : this.transform(result);

    if (this.cache) {
      for (const p of visited) this.searchCache.set(p, transformed);
    }

    return transformed;
  }

  /**
   * Returns a full options object by merging user-provided options with
   * defaults
   *
   * @param name Script name
   * @param options User-provided options
   * @returns Full config
   */
  private getOptions(
    name: string,
    options?: MidconfigOptions,
  ): Required<MidconfigOptions> {
    return {
      stopDir: this.fileManager.getHomeDir(),
      searchPlaces: Midconfig.getDefaultSearchPlaces(name),
      ignoreEmptySearchPlaces: true,
      cache: true,
      transform: async (x) => x,
      packageProp: [name],
      ...options,
    };
  }

  protected static getDefaultSearchPlaces(name: string): string[] {
    return [
      'package.json',
      `.${name}rc.json`,
      `.${name}rc.js`,
      `.${name}rc.cjs`,
      `.${name}rc.mjs`,
      `.config/${name}rc`,
      `.config/${name}rc.json`,
      `.config/${name}rc.js`,
      `.config/${name}rc.cjs`,
      `.config/${name}rc.mjs`,
      `${name}.config.js`,
      `${name}.config.cjs`,
      `${name}.config.mjs`,
    ];
  }

  protected static getPackageProp(
    props: string | string[],
    obj: PackageJson,
  ): unknown {
    if (typeof props === 'string' && props in obj) return obj[props];
    return (
      (Array.isArray(props) ? props : props.split('.')).reduce(
        // @ts-expect-error pretty loose!
        (acc, prop) => (acc === undefined ? acc : acc[prop]),
        obj,
      ) || null
    );
  }

  /**
   * Returns a function which abstracts setting something in a cache.
   *
   * @param enableCache Whether or not to actually enable caching
   * @returns
   */
  protected static makeEmplace(enableCache: boolean): EmplaceFn {
    return <T>(c: Map<string, T>, filepath: string, res: T): T => {
      if (enableCache) c.set(filepath, res);
      return res;
    };
  }

  /**
   * Get the proper parent directory of a path
   *
   * On *nix, if cwd is not under the user's home dir, the last path will be
   * `''`, (e.g., `/build` to `''`), but it should be `/` actually. And on
   * Windows, this will never happen. (`C:\build` to `C:`)
   *
   * @see {@link https://github.com/antonk52/lilconfig/issues/17}
   */
  protected static parentDir(p: string): string {
    return path.dirname(p) || path.sep;
  }

  /**
   * Asserts `filepath` is non-empty
   *
   * @param filepath Some filepath
   * @todo Custom exception
   */
  protected static validateFilePath(filepath: string) {
    if (!filepath) throw new Error('load must pass a non-empty string');
  }

  /**
   * Asserts `loader` is a function
   *
   * @param loader A config loader
   * @param ext File extension
   * @todo Custom exception
   */
  protected static validateLoader(loader: Loader, ext: string): void {
    if (!loader) throw new Error(`No loader specified for extension "${ext}"`);
    if (typeof loader !== 'function')
      throw new Error('loader is not a function');
  }
}
