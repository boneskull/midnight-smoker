/**
 * Provides a wrapper around a plugin.
 *
 * @packageDocumentation
 * @see {@link PluginMetadata}
 */
import {TRANSIENT} from '#constants';
import {InvalidArgError} from '#error/invalid-arg-error';
import {asValidationError} from '#error/validation-error';
import {BLESSED_PLUGINS, type BlessedPlugin} from '#plugin/blessed';
import * as Schema from '#schema/meta/for-plugin-metadata';
import {isString} from '#util/guard/common';
import {type LiteralUnion} from 'type-fest';

/**
 * All the metadata collected about a plugin.
 *
 * Contains:
 *
 * - Maps of all components the plugin provides.
 * - The plugin's `package.json` contents.
 * - The plugin's entry point.
 * - The plugin's unique identifier.
 *
 * @todo The identifier _should_ be unique. Make sure that's tracked somewhere.
 */
export class PluginMetadata implements Schema.StaticPluginMetadata {
  /**
   * @internal
   */
  public static readonly Transient = TRANSIENT;

  /**
   * Plugin description. May be derived from {@link pkgJson} or provided in
   * {@link Schema.PluginMetadataOpts}.
   */
  public readonly description?: string;

  /**
   * Plugin entry point. Usually a path and resolved from {@link requestedAs}.
   */
  public readonly entryPoint: LiteralUnion<typeof TRANSIENT, string>;

  /**
   * A map of executor names to {@link SomeExecutor} objects contained in the
   * plugin
   *
   * @group Component Map
   */
  public readonly executorMap: Map<string, Schema.Executor>;

  /**
   * {@inheritDoc StaticPluginMetadata.id}
   */
  public readonly id: string;

  /**
   * The contents of the plugin's `package.json`.
   */
  public readonly pkgJson?: Schema.NormalizedPackageJson;

  /**
   * A map of package manager names to {@link PackageManager} objects contained
   * in the plugin
   *
   * @group Component Map
   */
  public readonly pkgManagerMap: Map<string, Schema.PkgManager>;

  /**
   * A map of reporter names to {@link Schema.Reporter} objects contained in the
   * plugin
   *
   * @group Component Map
   */
  public readonly reporterMap: Map<string, Schema.Reporter>;

  /**
   * The name of the plugin as requested by the user
   */
  public readonly requestedAs: string;

  public readonly ruleMap: Map<string, Schema.SomeRule>;

  /**
   * Version of plugin. May be derived from {@link pkgJson} or provided in
   * {@link Schema.PluginMetadataOpts}.
   */
  public readonly version?: string;

  /**
   * {@inheritDoc create:(0)}
   */
  protected constructor(entryPoint: string, id?: string);

  /**
   * {@inheritDoc create:(1)}
   */
  protected constructor(opts: Schema.PluginMetadataOpts);
  protected constructor(
    optsOrEntryPoint: Schema.PluginMetadataOpts | string,
    id?: string,
  ) {
    let opts: Schema.NormalizedPluginMetadataOpts;

    try {
      opts = isString(optsOrEntryPoint)
        ? Schema.PluginMetadataOptsSchema.parse({
            entryPoint: optsOrEntryPoint,
            id,
            requestedAs: optsOrEntryPoint,
          })
        : Schema.PluginMetadataOptsSchema.parse(optsOrEntryPoint);
    } catch (err) {
      optsOrEntryPoint;
      throw asValidationError(err);
    }

    // basic information
    this.id = opts.id;
    this.requestedAs = opts.requestedAs ?? opts.entryPoint;
    this.entryPoint = opts.entryPoint;
    this.pkgJson = opts.pkgJson;
    this.description = opts.description || opts.pkgJson?.description;

    // component maps
    this.pkgManagerMap = new Map();
    this.executorMap = new Map();
    this.reporterMap = new Map();
    this.ruleMap = new Map();
    this.version = this.version ?? this.pkgJson?.version;
  }

  /**
   * Creates a new {@link PluginMetadata} instance from an entry point path and
   * optional identifier.
   *
   * @param entryPoint - Path to entry point. Must be resolvable by Node.js
   * @param id - Plugin identifier
   * @returns - A new {@link PluginMetadata} instance
   * @internal
   */
  public static create(
    entryPoint: string,
    id?: string,
  ): Readonly<PluginMetadata>;

  /**
   * Creates a new {@link PluginMetadata} from a {@link Schema.PluginMetadataOpts}
   * object.
   *
   * @param opts - {@link Schema.PluginMetadataOpts}
   * @returns - A new {@link PluginMetadata} instance
   * @internal
   */
  public static create(
    opts: Schema.PluginMetadataOpts,
  ): Readonly<PluginMetadata>;

  /**
   * Creates a new {@link PluginMetadata} from an existing {@link PluginMetadata}
   * object and some opts--kind of like a "clone" operation.
   *
   * Necessary because `PluginMetadata` should always be frozen.
   *
   * @param metadata - Existing metadata
   * @param opts - New props (or just an id)
   * @returns - A new {@link PluginMetadata} instance based on `metadata`
   */
  public static create(
    metadata: Readonly<PluginMetadata>,
    opts: Partial<Schema.PluginMetadataOpts> | string,
  ): Readonly<PluginMetadata>;

  public static create(
    optsEntryPtOrMetadata:
      | Readonly<PluginMetadata>
      | Schema.PluginMetadataOpts
      | string,
    idOrOpts?: Partial<Schema.PluginMetadataOpts> | string,
  ) {
    if (!optsEntryPtOrMetadata) {
      throw new InvalidArgError(
        'Expected PluginMetadataOpts, a non-empty entryPoint string, or a PluginMetadata instance',
        {argName: 'optsEntryPtOrMetadata'},
      );
    }

    let metadata: PluginMetadata;
    if (isString(optsEntryPtOrMetadata)) {
      if (idOrOpts && typeof idOrOpts !== 'string') {
        throw new InvalidArgError('id must be a string', {
          argName: 'id',
        });
      }
      metadata = new PluginMetadata(optsEntryPtOrMetadata, idOrOpts);
    } else {
      const opts = isString(idOrOpts) ? {id: idOrOpts} : idOrOpts ?? {};
      metadata = new PluginMetadata({
        ...optsEntryPtOrMetadata,
        ...opts,
      });
    }

    return Object.freeze(metadata);
  }

  /**
   * Creates a _transient_ {@link PluginMetadata} object, which is considered to
   * be an in-memory plugin.
   */
  public static createTransient(
    name: string,
    pkg?: Schema.NormalizedPackageJson,
  ): Readonly<PluginMetadata> {
    if (!name) {
      throw new InvalidArgError(
        'name is required when creating a transient PluginMetadata instance',
        {argName: 'name'},
      );
    }
    return PluginMetadata.create({
      entryPoint: PluginMetadata.Transient,
      id: name,
      pkgJson: pkg,
    });
  }

  /**
   * Adds a {@link Schema.Executor} to the plugin's
   * {@link PluginMetadata.executorMap}.
   *
   * @param name Executor name
   * @param value Executor definition
   * @internal
   */
  public addExecutor(name: string, value: Schema.Executor): void {
    this.executorMap.set(name, value);
  }

  /**
   * Adds a {@link Schema.PkgManager} to the plugin's
   * {@link PluginMetadata.pkgManagerMap}.
   *
   * Should only be called within a `DefinePkgManagerFn` post-validation and
   * registration.
   *
   * @param value Package manager definition
   * @internal
   */
  public addPkgManager(value: Schema.PkgManager): void {
    this.pkgManagerMap.set(value.name, value);
  }

  /**
   * Adds a {@link Schema.Reporter} to the plugin's
   * {@link PluginMetadata.reporterMap}.
   *
   * Should only be called within a `DefineReporterFn` post-validation and
   * registration.
   *
   * @param value Reporter definition
   * @internal
   */
  public addReporter(value: Schema.Reporter): void {
    this.reporterMap.set(value.name, value);
  }

  /**
   * Adds a {@link Schema.Rule} to the plugin's component map.
   *
   * Should only be called within a `DefineRuleFn` post-validation and
   * registration.
   *
   * @param value Rule definition
   * @internal
   */
  public addRule(rule: Schema.SomeRule): void {
    const {name} = rule;
    this.ruleMap.set(name, rule);
  }

  /**
   * Serializes this object to a brief {@link Schema.StaticPluginMetadata}
   * object.
   */
  public toJSON(): Schema.StaticPluginMetadata {
    return {
      description: this.description,
      entryPoint: this.entryPoint,
      id: this.id,
      pkgManagerNames: this.pkgManagerNames,
      reporterNames: this.reporterNames,
      ruleNames: this.ruleNames,
      version: this.version,
    };
  }

  /**
   * Returns a string representation of this metadata
   */
  public toString(): string {
    return `[Plugin ${this.id}${this.version ? `@${this.version}` : ''}]`;
  }

  public get isBlessed(): boolean {
    return BLESSED_PLUGINS.includes(this.id as BlessedPlugin);
  }

  public get pkgManagerNames(): string[] {
    return this.pkgManagers.map(({name}) => name);
  }

  public get pkgManagers(): Schema.PkgManager[] {
    return [...this.pkgManagerMap.values()];
  }

  public get reporterNames(): string[] {
    return this.reporters.map(({name}) => name);
  }

  public get reporters(): Schema.Reporter[] {
    return [...this.reporterMap.values()];
  }

  public get ruleNames(): string[] {
    return this.rules.map(({name}) => name);
  }

  public get rules(): Schema.SomeRule[] {
    return [...this.ruleMap.values()];
  }
}

export type {LiteralUnion};
