/**
 * Provides {@link PkgManagerSpec} which represents a name and a version of a
 * particular package manager.
 *
 * @packageDocumentation
 */

import {DEFAULT_PKG_MANAGER_BIN, DEFAULT_PKG_MANAGER_VERSION} from '#constants';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager-spec';
import {getSystemPkgManagerVersion} from '#util/pkg-util';
import {instanceofSchema} from '#util/schema-util';
import {isString} from 'lodash';
import {parse, type SemVer} from 'semver';

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
    return {...this};
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

/**
 * Schema for {@link PkgManagerSpec}
 */
export const PkgManagerSpecSchema = instanceofSchema(PkgManagerSpec);
