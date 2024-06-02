/**
 * Provides {@link PkgManagerSpec} which represents a name and a version of a
 * particular package manager.
 *
 * @packageDocumentation
 */
import {DEFAULT_PKG_MANAGER_BIN, DEFAULT_PKG_MANAGER_VERSION} from '#constants';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {FileManager} from '#util/filemanager';
import type {NonEmptyArray} from '#util/util';
import Debug from 'debug';
import {globIterate} from 'glob';
import {isString, memoize} from 'lodash';
import {execFile as _execFile} from 'node:child_process';
import path from 'node:path';
import {promisify} from 'node:util';
import {parse, type SemVer} from 'semver';

const debug = Debug('midnight-smoker:pkg-manager-spec');

const execFile = promisify(_execFile);

/**
 * Options for {@link PkgManagerSpec.fromPkgManagerDefs}.
 */
export interface FromPkgManagerDefsOpts {
  cwd?: string;
  desiredPkgManagers?: Array<string | Readonly<PkgManagerSpec>>;
  workspaceInfo?: WorkspaceInfo[];
}

export interface PkgManagerOracleOpts {
  fileManager?: FileManager;
  getSystemPkgManagerVersion?: (bin: string) => Promise<string>;
  cwd?: string;
  workspaceInfo?: WorkspaceInfo[];
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
  bin?: string;

  /**
   * The version or dist-tag of the requested package manager.
   *
   * @defaultValue `latest`
   */
  version?: string | SemVer;
}

export interface GuessPkgManagerOptions {
  cwd?: string;
  workspaceInfo?: WorkspaceInfo[];
}

/**
 * @internal
 * @todo The coupling here sucks. do something about it
 */
export class PkgManagerOracle {
  private fileManager: FileManager;

  private getSystemPkgManagerVersion: (bin: string) => Promise<string>;

  public readonly cwd: string;

  private readonly workspaceInfo: WorkspaceInfo[];

  constructor(
    private readonly defs: NonEmptyArray<PkgManagerDef>,
    {
      fileManager = FileManager.create(),
      getSystemPkgManagerVersion = PkgManagerOracle.defaultGetSystemPkgManagerVersion,
      cwd = process.cwd(),
      workspaceInfo = [],
    }: PkgManagerOracleOpts = {},
  ) {
    this.getSystemPkgManagerVersion = getSystemPkgManagerVersion;
    this.fileManager = fileManager;
    this.cwd = cwd;
    this.workspaceInfo = workspaceInfo;
  }

  public static guessPackageManager(
    this: void,
    defs: NonEmptyArray<PkgManagerDef>,
    opts: GuessPkgManagerOptions = {},
  ): Promise<Readonly<PkgManagerSpec>> {
    return new PkgManagerOracle(defs, opts).guessPackageManager();
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
  public async getPkgManagerFromLockfiles(): Promise<string | undefined> {
    const {cwd, defs, fileManager} = this;
    const lockfileMap = new Map(
      defs
        .filter((def) => Boolean(def.lockfile))
        .map((def) => [path.join(cwd, def.lockfile!), def.bin]),
    );

    const patterns = [...lockfileMap.keys()];
    for await (const match of globIterate(patterns, {
      fs: fileManager.fs,
      cwd,
      absolute: true,
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
  public async getPkgManagerFromPackageJson(
    where: WorkspaceInfo | string = this.cwd,
  ): Promise<Readonly<PkgManagerSpec> | undefined> {
    const cwd = isString(where) ? where : where.localPath;
    const result = await this.fileManager.findPkgUp(cwd);
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
   * @returns Package manager spec
   */
  public async guessPackageManager(): Promise<Readonly<PkgManagerSpec>> {
    // this should be tried first, as it's "canonical"
    const spec = await Promise.race([
      ...this.workspaceInfo.map(async (ws) =>
        this.getPkgManagerFromPackageJson(ws),
      ),
      this.getPkgManagerFromPackageJson(this.cwd),
    ]);
    if (spec) {
      debug('Found package manager from package.json: %s', spec);
      return spec;
    }
    const bin = await this.getPkgManagerFromLockfiles();
    const version = await this.getSystemPkgManagerVersion(
      bin ?? DEFAULT_PKG_MANAGER_BIN,
    );
    return PkgManagerSpec.create({bin, version, isSystem: true});
  }

  /**
   * Queries a package manager executable for its version
   *
   * @param bin Package manager executable; defined in a {@link PkgManagerDef}
   * @returns Version string
   */
  public static defaultGetSystemPkgManagerVersion = memoize(
    async (bin: string): Promise<string> => {
      try {
        const {stdout} = await execFile(bin, ['--version']);
        return stdout.trim();
      } catch {
        return DEFAULT_PKG_MANAGER_VERSION;
      }
    },
  );
}

/**
 * This represents a specification for a requested package manager.
 *
 * Where possible, dist-tags are normalized to version numbers. When this can be
 * done, a {@link SemVer} object is created, and the {@link PkgManagerSpec} is
 * {@link PkgManagerSpec.hasSemVer considered valid}.
 */
export class PkgManagerSpec implements StaticPkgManagerSpec {
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
  public readonly bin: string;

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
    bin = DEFAULT_PKG_MANAGER_BIN,
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

    this.bin = bin;
    this.isSystem = Boolean(isSystem);
  }

  /**
   * This returns `true` if the version is valid semantic version.
   */
  public get hasSemVer(): boolean {
    return Boolean(this.semver);
  }

  public get spec(): string {
    return this.toString();
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
    bin: pkgManager = DEFAULT_PKG_MANAGER_BIN,
    version = DEFAULT_PKG_MANAGER_VERSION,
    isSystem = false,
  }: PkgManagerSpecOpts = {}): Readonly<PkgManagerSpec> {
    if (!isString(version)) {
      version = version.format();
    }
    return Object.freeze(
      new PkgManagerSpec({bin: pkgManager, version, isSystem}),
    );
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
          bin: pkgManager,
          version,
          isSystem: specIsSystem,
        });
      }
      specOrOpts = {bin: pkgManager};
    }

    const {
      bin: pkgManager = DEFAULT_PKG_MANAGER_BIN,
      version: allegedVersion,
      isSystem = false,
    } = specOrOpts;

    // TODO: verify that we need anything other than assignment to the default.
    // I think we route around it via guessPackageManager()
    const version =
      isSystem && !allegedVersion
        ? await PkgManagerOracle.defaultGetSystemPkgManagerVersion(pkgManager)
        : allegedVersion || DEFAULT_PKG_MANAGER_VERSION;

    return PkgManagerSpec.create({bin: pkgManager, version, isSystem});
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
    {desiredPkgManagers = [], cwd, workspaceInfo}: FromPkgManagerDefsOpts = {},
  ): Promise<NonEmptyArray<Readonly<PkgManagerSpec>>> {
    if (desiredPkgManagers.length) {
      const specs = (await PkgManagerSpec.fromMany(
        desiredPkgManagers,
      )) as NonEmptyArray<Readonly<PkgManagerSpec>>;
      if (specs.length) {
        return specs;
      }
    }
    return [
      await PkgManagerOracle.guessPackageManager(defs, {cwd, workspaceInfo}),
    ];
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
        ? `${this.bin}@${this.version} (system)`
        : `${this.bin} (system)`;
    }
    return `${this.bin}@${this.version}`;
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

export interface PkgManagerDefSpec {
  def: PkgManagerDef;
  spec: Readonly<PkgManagerSpec>;
}
