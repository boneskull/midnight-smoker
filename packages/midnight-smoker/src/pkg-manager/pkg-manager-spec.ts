/**
 * Provides {@link PkgManagerSpec} which represents a name and a version of a
 * particular package manager.
 *
 * @packageDocumentation
 */
import {type SYSTEM} from '#constants';
import {parseDesiredPkgManagerSpec} from '#schema/pkg-manager/desired-pkg-manager';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';
import * as assert from '#util/assert';
import {memoize} from '#util/decorator';
import {isString} from '#util/guard/common';
import {parse, type SemVer} from 'semver';
import {type Merge} from 'type-fest';

/**
 * Options common to both {@link PkgManagerSpecParams} and
 * {@link ClonePkgManagerSpecOptions} which differ from a
 * {@link StaticPkgManagerSpec}
 */
type CommonPkgManagerSpecOptions = {
  /**
   * This is also a computed property and is ignored
   */
  isSystem?: unknown;

  /**
   * `label` may be provided, but it is ignored -- it's a computed property
   */
  label?: unknown;

  /**
   * A version string or a {@link SemVer} object (as opposed to just a version
   * string from {@link StaticPkgManagerSpec})
   */
  version: SemVer | string;
};

/**
 * Params for {@link PkgManagerSpec.create} or its constructor
 */
export type PkgManagerSpecParams = Merge<
  StaticPkgManagerSpec,
  CommonPkgManagerSpecOptions
>;

/**
 * Options for {@link PkgManagerSpec.clone}.
 */
export type ClonePkgManagerSpecOptions = Merge<
  Partial<StaticPkgManagerSpec>,
  CommonPkgManagerSpecOptions
>;

/**
 * This represents a specification for a requested package manager.
 *
 * Where possible, dist-tags are normalized to version numbers. When this can be
 * done, a {@link SemVer} object is created, and the {@link PkgManagerSpec} is
 * {@link PkgManagerSpec.hasSemVer considered valid}.
 */
export class PkgManagerSpec implements StaticPkgManagerSpec {
  /**
   * The package manager executable name
   */
  public readonly bin?: string;

  public readonly name: string;

  /**
   * The "desired package manager spec" string
   */
  public readonly requestedAs?: string;

  /**
   * The version or dist-tag of the requested package manager.
   */
  public readonly version: string;

  /**
   * Creates a {@link SemVer} from the version, if possible.
   *
   * @param opts - Options for the package manager specification
   */
  public constructor({bin, name, requestedAs, version}: PkgManagerSpecParams) {
    const semVer = parse(version);

    if (semVer) {
      semVers.set(this, semVer);
      this.version = semVer.format();
    } else {
      // I'm not sure why `version` would be a `SemVer` here, since `parse`
      // shouild jsut return it. best guess. may not be possible
      assert.ok(isString(version), 'Possible SemVer lib version conflict!');
      this.version = version;
    }

    this.name = name;
    this.bin = bin;
    this.requestedAs = requestedAs ? `${requestedAs}` : undefined;
  }

  /**
   * Create a new {@link PkgManagerSpec} from the provided options or full
   * `<name>@<version>` string (where `<version>` is not `system`).
   *
   * @param params Params or string
   * @param partialParams Additional params (useful if `params` is a string)
   * @returns A new read-only {@link PkgManagerSpec}
   */
  @memoize()
  public static create<T extends string>(
    params:
      | `${string}@${T extends typeof SYSTEM ? never : T}`
      | PkgManagerSpecParams,
    partialParams?: Partial<PkgManagerSpecParams>,
  ): Readonly<PkgManagerSpec> {
    if (isString(params)) {
      return Object.freeze(
        new PkgManagerSpec({
          ...parseDesiredPkgManagerSpec(params),
          ...partialParams,
        }),
      );
    }
    return Object.freeze(new PkgManagerSpec({...params, ...partialParams}));
  }

  /**
   * Clones this {@link PkgManagerSpec} and returns a new one.
   *
   * @param opts Overrides
   * @returns New `PkgManagerSpec` with overrides applied
   */
  public clone(opts?: ClonePkgManagerSpecOptions) {
    return PkgManagerSpec.create(this.toJSON(), opts);
  }

  /**
   * Returns a JSON representation of this {@link PkgManagerSpec}.
   *
   * @returns A JSON representation of this {@link PkgManagerSpec}
   */
  public toJSON(): StaticPkgManagerSpec {
    return {
      bin: this.bin,
      label: this.toString(),
      name: this.name,
      requestedAs: this.requestedAs,
      version: this.version,
    };
  }

  /**
   * Probably the most useful method in this class
   *
   * @returns A string representation of this {@link PkgManagerSpec}
   */
  public toString() {
    let repr = this.name;
    if (this.isSystem) {
      if (this.hasSemVer) {
        repr = `${repr}@${this.version}`;
      }
      return `${repr} (system)`;
    } else {
      repr = `${repr}@${this.version}`;
    }
    return repr;
  }

  /**
   * This returns `true` if the version is valid semantic version.
   */
  public get hasSemVer(): boolean {
    return !!this.semver;
  }

  /**
   * If `true`, the `PkgManagerController` should treat this using the "system"
   * `Executor`.
   *
   * If this is `true`, the {@link PkgManagerSpec.version version} will be used
   * only for display purposes (it is informational for the user).
   *
   * Also, see {@link PkgManagerSpec.toString} for how the display differs.
   */
  get isSystem() {
    return !!this.bin;
  }

  public get label(): string {
    return this.toString();
  }

  /**
   * Returns a {@link SemVer} object if the version is valid, or `undefined`
   * otherwise
   */
  public get semver(): SemVer | undefined {
    return semVers.get(this);
  }
}

/**
 * {@link SemVer} objects for {@link PkgManagerSpec} instances.
 *
 * This is stuffed in here because we generally work with readonly
 * `PkgManagerSpec` instances, and "private" fields don't make it through the
 * imagined readonliness.
 */
const semVers = new WeakMap<PkgManagerSpec, SemVer>();
