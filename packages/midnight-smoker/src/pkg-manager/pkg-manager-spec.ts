/**
 * Provides {@link PkgManagerSpec} which represents a name and a version of a
 * particular package manager.
 *
 * @packageDocumentation
 */
import {DEFAULT_PKG_MANAGER_BIN, DEFAULT_PKG_MANAGER_VERSION} from '#constants';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {FileManager, type FileManagerOpts} from '#util/filemanager';
import {getSystemPkgManagerVersion} from '#util/pkg-util';
import type {NonEmptyArray} from '#util/util';
import {globIterate} from 'glob';
import {isString} from 'lodash';
import path from 'node:path';
import {parse, type SemVer} from 'semver';

/**
 * Options for {@link PkgManagerSpec.fromPkgManagerDefs}.
 */
export interface FromPkgManagerDefsOpts {
  cwd?: string;
  desiredPkgManagers?: Array<string | Readonly<PkgManagerSpec>>;
}

export interface PkgManagerOracleOpts {
  fileManagerOpts?: FileManagerOpts;
  getSystemPkgManagerVersion?: (bin: string) => Promise<string>;
  cwd?: string;
}

/**
 * Options for {@link PkgManagerSpec}.
 */
export interface PkgManagerSpecOpts {
  /**
   * If `true`, the `PkgManagerController` should treat this using the "system"
   * `Executor`
   *
   * @defaultValue `false`
   */
  isSystem?: boolean;

  /**
   * The package manager executable name
   *
   * @defaultValue `npm`
   */
  pkgManager?: string;

  /**
   * The version or dist-tag of the requested package manager.
   *
   * @defaultValue `latest`
   */
  version?: string | SemVer;
}

/**
 * @internal
 * @todo The coupling here sucks. do something about it
 */
export class PkgManagerOracle {
  private fm: FileManager;

  private getSystemPkgManagerVersion: (bin: string) => Promise<string>;

  public readonly cwd: string;

  constructor(opts: PkgManagerOracleOpts = {}) {
    this.getSystemPkgManagerVersion =
      opts.getSystemPkgManagerVersion ?? getSystemPkgManagerVersion;
    this.fm = FileManager.create(opts.fileManagerOpts);
    this.cwd = opts.cwd ?? process.cwd();
  }

  public static guessPackageManager(
    this: void,
    pkgManagerDefs: PkgManagerDef[],
    cwd?: string,
  ): Promise<Readonly<PkgManagerSpec>> {
    return new PkgManagerOracle({cwd}).guessPackageManager(pkgManagerDefs);
  }

  /**
   * Given the `lockfile` specified in the provided {@link PkgManagerDef}
   * objects, looks in `cwd` for them.
   *
   * Returns the first found.
   *
   * @param pkgManagerDefs - An array of `PkgManagerDef` objects.
   * @returns Package manager bin, if found
   */
  public async getPkgManagerFromLockfiles(
    pkgManagerDefs: PkgManagerDef[],
  ): Promise<string | undefined> {
    const cwd = this.cwd;
    const lockfileMap = new Map(
      pkgManagerDefs
        .filter((def) => Boolean(def.lockfile))
        .map((def) => [path.join(cwd, def.lockfile!), def.bin]),
    );

    const patterns = [...lockfileMap.keys()];

    for await (const match of globIterate(patterns, {
      fs: this.fm.fs,
      cwd,
      absolute: false,
    })) {
      if (lockfileMap.has(match)) {
        return lockfileMap.get(match)!;
      }
    }
  }

  /**
   * Looks at the closest `package.json` to `cwd` in the `packageManager` field
   * for a value.
   *
   * This should _not_ be a "system" package manager.
   *
   * @returns Package manager spec, if found
   */
  public async getPkgManagerFromPackageJson(): Promise<
    Readonly<PkgManagerSpec> | undefined
  > {
    const result = await this.fm.findPkgUp(this.cwd);
    this.fm.id; //?
    const pkgManager = result?.packageJson.packageManager;

    if (pkgManager) {
      return PkgManagerSpec.from(pkgManager);
    }
  }

  /**
   * Attempts to guess which package manager to use if none were provided by the
   * user.
   *
   * The strategy is:
   *
   * 1. Look for a `packageManager` field in the closest `package.json` from `cwd`
   * 2. Look for a lockfile in the closest `package.json` from `cwd` that matches
   *    one of the `lockfile` fields as specified by the {@link PkgManagerDef}
   *    objects
   * 3. Use the default package manager (npm)
   *
   * In the first case, we are assuming the field is a complete "package manager
   * spec" (with version). In the other two cases, we don't know what version is
   * involved, so we'll just use the "system" package manager.
   *
   * @param pkgManagerDefs - Package manager definitions as provided by plugins
   * @param cwd - Current working directory having an ancestor `package.json`
   *   file
   * @returns Package manager spec
   */
  public async guessPackageManager(
    pkgManagerDefs: PkgManagerDef[],
  ): Promise<Readonly<PkgManagerSpec>> {
    // this should be tried first, as it's "canonical"
    let spec = await this.getPkgManagerFromPackageJson();
    if (!spec) {
      const pkgManager = await this.getPkgManagerFromLockfiles(pkgManagerDefs);
      if (pkgManager) {
        const version = await this.getSystemPkgManagerVersion(pkgManager);
        spec = PkgManagerSpec.create({pkgManager, version, isSystem: true});
      }
    }

    return spec ?? PkgManagerSpec.create();
  }
}

/**
 * This represents a specification for a requested package manager.
 *
 * Where possible, dist-tags are normalized to version numbers. When this can be
 * done, a {@link SemVer} object is created, and the {@link PkgManagerSpec} is
 * {@link PkgManagerSpec.hasSemVer considered valid}.
 */
export class PkgManagerSpec {
  /**
   * If `true`, the `PkgManagerController` should treat this using the "system"
   * `Executor`.
   *
   * If this is `true`, the {@link PkgManagerSpec.version version} will be used
   * only for display purposes (it is informational for the user).
   *
   * Also, see {@link PkgManagerSpec.toString} for how the display differs.
   */
  public readonly isSystem: boolean;

  /**
   * The package manager executable name
   */
  public readonly pkgManager: string;

  /**
   * The version or dist-tag of the requested package manager.
   */
  public readonly version: string;

  /**
   * Creates a {@link SemVer} from the version, if possible.
   *
   * @param opts - Options for the package manager specification
   */
  public constructor({
    pkgManager = DEFAULT_PKG_MANAGER_BIN,
    version = DEFAULT_PKG_MANAGER_VERSION,
    isSystem = false,
  }: PkgManagerSpecOpts = {}) {
    const semver = isString(version) ? parse(version) || undefined : version;
    if (semver) {
      semvers.set(this, semver);
      this.version = semver.format();
    } else {
      this.version = version as string;
    }

    this.pkgManager = pkgManager;
    this.isSystem = Boolean(isSystem);
  }

  /**
   * This returns `true` if the version is valid semantic version.
   */
  public get hasSemVer() {
    return Boolean(this.semver);
  }

  /**
   * Returns a {@link SemVer} object if the version is valid, or `undefined`
   * otherwise
   */
  public get semver(): SemVer | undefined {
    return semvers.get(this);
  }

  /**
   * Create a new {@link PkgManagerSpec} from the provided options and defaults.
   *
   * @param opts Options
   * @returns A new read-only {@link PkgManagerSpec}
   */
  public static create({
    pkgManager = DEFAULT_PKG_MANAGER_BIN,
    version = DEFAULT_PKG_MANAGER_VERSION,
    isSystem = false,
  }: PkgManagerSpecOpts = {}): Readonly<PkgManagerSpec> {
    if (!isString(version)) {
      version = version.format();
    }
    return Object.freeze(new PkgManagerSpec({pkgManager, version, isSystem}));
  }

  /**
   * Given a normalizable spec-style string (`foo@bar`) or a
   * {@link PkgManagerSpec}, resolves a new {@link PkgManagerSpec}.
   *
   * If `spec` is a {@link PkgManagerSpec}, returns a
   * {@link PkgManagerSpec.clone clone}.
   *
   * @param spec - A {@link PkgManagerSpec} or a normalizable spec-style string
   * @param isSystem - If `true`, set the
   *   {@link PkgManagerSpec.isSystem isSystem} flag.
   * @returns A new {@link PkgManagerSpec}
   */
  public static async from(
    this: void,
    spec?: Readonly<PkgManagerSpec> | string,
    isSystem?: boolean,
  ): Promise<Readonly<PkgManagerSpec>>;

  /**
   * Given a {@link PkgManagerSpecOpts}, resolves a new {@link PkgManagerSpec}.
   *
   * @param opts - Options for the package manager specification
   * @returns A new {@link PkgManagerSpec}
   */
  public static async from(
    this: void,
    opts?: PkgManagerSpecOpts,
  ): Promise<Readonly<PkgManagerSpec>>;
  public static async from(
    this: void,
    specOrOpts: Readonly<PkgManagerSpec> | PkgManagerSpecOpts | string = {},
    specIsSystem = false,
  ): Promise<Readonly<PkgManagerSpec>> {
    if (specOrOpts instanceof PkgManagerSpec) {
      return specOrOpts.clone();
    }
    if (isString(specOrOpts)) {
      const [pkgManager, version] = PkgManagerSpec.parse(specOrOpts) ?? [];
      if (pkgManager && version) {
        return PkgManagerSpec.create({
          pkgManager,
          version,
          isSystem: specIsSystem,
        });
      }
      specOrOpts = {pkgManager};
    }

    const {
      pkgManager = DEFAULT_PKG_MANAGER_BIN,
      version: allegedVersion,
      isSystem = false,
    } = specOrOpts;

    // TODO: verify that we need anything other than assignment to the default.
    // I think we route around it via guessPackageManager()
    const version =
      isSystem && !allegedVersion
        ? await getSystemPkgManagerVersion(pkgManager)
        : allegedVersion || DEFAULT_PKG_MANAGER_VERSION;

    return PkgManagerSpec.create({pkgManager, version, isSystem});
  }

  public static async fromMany(
    specs: Iterable<PkgManagerSpec | string>,
  ): Promise<Readonly<PkgManagerSpec>[]> {
    return Promise.all([...specs].map((spec) => PkgManagerSpec.from(spec)));
  }

  /**
   * Given a nonempty list of package manager definitions, resolves a list of
   * {@link PkgManagerSpec} instances.
   *
   * This is guaranteed to return at least one {@link PkgManagerSpec} instance.
   *
   * @param defs - Package manager definitions
   * @param opts - Options
   * @returns One or more {@link PkgManagerSpec} instances representing available
   *   package managers
   */
  public static async fromPkgManagerDefs(
    this: void,
    defs: NonEmptyArray<PkgManagerDef>,
    {desiredPkgManagers = [], cwd = process.cwd()}: FromPkgManagerDefsOpts = {},
  ): Promise<NonEmptyArray<Readonly<PkgManagerSpec>>> {
    if (desiredPkgManagers.length) {
      const specs = (await PkgManagerSpec.fromMany(
        desiredPkgManagers,
      )) as NonEmptyArray<Readonly<PkgManagerSpec>>;
      if (specs.length) {
        return specs;
      }
    }
    return [await PkgManagerOracle.guessPackageManager(defs, cwd)];
  }

  /**
   * Parses a spec-style string (`foo@bar`) into a tuple of package manager name
   * and version if possible.
   *
   * Returns `undefined` if unable to parse
   *
   * @param spec Spec-style `name@version` string
   * @returns A tuple of package manager name and version if possible
   * @internal
   */
  public static parse(
    spec: string,
  ): [pkgManager: string, version: string | undefined] | undefined {
    let pkgManager: string, version: string;
    const matches = spec.match(PKG_MANAGER_SPEC_REGEX);
    if (matches) {
      [pkgManager, version] = matches.slice(1, 3);
      return [pkgManager, version];
    }
  }

  /**
   * Clones this {@link PkgManagerSpec} and returns a new one.
   *
   * @param opts Overrides
   * @returns New `PkgManagerSpec` with overrides applied
   */
  public clone(opts: PkgManagerSpecOpts = {}) {
    return PkgManagerSpec.create({...this.toJSON(), ...opts});
  }

  /**
   * Returns a JSON representation of this {@link PkgManagerSpec}.
   *
   * @returns A JSON representation of this {@link PkgManagerSpec}
   */
  public toJSON(): StaticPkgManagerSpec {
    return {...this, spec: this.toString()};
  }

  public toString() {
    if (this.isSystem) {
      return this.hasSemVer
        ? `${this.pkgManager}@${this.version} (system)`
        : `${this.pkgManager} (system)`;
    }
    return `${this.pkgManager}@${this.version}`;
  }
}

/**
 * The regex that {@link PkgManagerSpec.parse} uses.
 */
const PKG_MANAGER_SPEC_REGEX = /^([^@]+?)(?:@([^@]+))?$/;

/**
 * {@link SemVer} objecst for {@link PkgManagerSpec} instances.
 *
 * This is stuffed in here because we generally work with readonly versions, and
 * private fields don't make it out.
 */
const semvers = new WeakMap<PkgManagerSpec, SemVer>();

export const {guessPackageManager} = PkgManagerOracle;
