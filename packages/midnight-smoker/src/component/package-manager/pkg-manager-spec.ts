import {isString} from 'lodash';
import {type SemVer} from 'semver';
import {
  DEFAULT_PKG_MANAGER_BIN,
  DEFAULT_PKG_MANAGER_VERSION,
} from '../../constants';
import {getSystemPkgManagerVersion} from '../../pkg-util';
import {instanceofSchema} from '../../schema-util';
import {normalizeVersion} from './version';

export type SystemPkgManagerSpec = PkgManagerSpec & {
  isSystem: true;
};

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
 * This represents a specification for a requested package manager.
 *
 * Where possible, dist-tags are normalized to version numbers. When this can be
 * done, a {@link SemVer} object is created, and the {@link PkgManagerSpec} is
 * {@link PkgManagerSpec.isValid considered valid}.
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
   * This constructor will attempt to {@link normalizeVersion normalize} any
   * dist-tag provided.
   *
   * If `pkgManager` is known and `version` is not a valid semantic version, it
   * is treated as a dist-tag. If that dist-tag is _not_ known, then this will
   * throw.
   *
   * @param opts - Options for the package manager specification
   */
  public constructor({
    pkgManager = DEFAULT_PKG_MANAGER_BIN,
    version = DEFAULT_PKG_MANAGER_VERSION,
    isSystem = false,
  }: PkgManagerSpecOpts = {}) {
    if (isString(version)) {
      const normalized = normalizeVersion(pkgManager, version);
      if (normalized) {
        semvers.set(this, normalized);
        this.version = normalized.format();
      }
      this.version ??= version;
    } else {
      this.version = version.format();
    }
    this.pkgManager = pkgManager;
    this.isSystem = Boolean(isSystem);
  }

  /**
   * This returns `true` if the version is valid semantic version.
   */
  public get isValid() {
    return Boolean(this.semver);
  }

  /**
   * Returns a {@link SemVer} object if the version is valid, or `undefined`
   * otherwise
   */
  public get semver(): SemVer | undefined {
    return semvers.get(this);
  }

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
      return PkgManagerSpec.create({
        pkgManager,
        version,
        isSystem: specIsSystem,
      });
    }

    let {
      pkgManager = DEFAULT_PKG_MANAGER_BIN,
      version = DEFAULT_PKG_MANAGER_VERSION,
      isSystem = false,
    } = specOrOpts;

    if (isSystem) {
      version = await getSystemPkgManagerVersion(pkgManager);
    }

    return PkgManagerSpec.create({pkgManager, version, isSystem});
  }

  public static parse(
    spec: string,
  ): [pkgManager: string, version: string] | undefined {
    let pkgManager: string, version: string;
    const matches = spec.match(PKG_MANAGER_SPEC_REGEX);
    if (matches) {
      [pkgManager, version] = matches.slice(1, 3);
      return [pkgManager, version];
    }
  }

  public clone(opts: PkgManagerSpecOpts = {}) {
    return PkgManagerSpec.create({...this.toJSON(), ...opts});
  }

  public toJSON() {
    return {...this};
  }

  public toString() {
    if (this.isSystem) {
      return this.isValid
        ? `${this.pkgManager}@${this.version} (system)`
        : `${this.pkgManager} (system)`;
    }
    return `${this.pkgManager}@${this.version}`;
  }
}

const PKG_MANAGER_SPEC_REGEX = /^([^@]+?)@([^@]+)$/;
/**
 * {@link SemVer} objecst for {@link PkgManagerSpec} instances.
 *
 * This is stuffed in here because we generally work with readonly versions, and
 * private fields don't make it out.
 */
const semvers = new WeakMap<PkgManagerSpec, SemVer>();
export const DEFAULT_PKG_MANAGER_SPEC = PkgManagerSpec.create();
export const zPkgManagerSpec = instanceofSchema(PkgManagerSpec);
