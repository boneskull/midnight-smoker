/**
 * Provides a wrapper around a plugin.
 *
 * @packageDocumentation
 * @see {@link PluginMetadata}
 */
import {TRANSIENT} from '#constants';
import {InvalidArgError} from '#error/invalid-arg-error';
import {
  loadPackageManagers,
  type LoadPackageManagersOpts,
} from '#pkg-manager/pkg-manager-loader';
import {type PkgManagerDefSpec} from '#pkg-manager/pkg-manager-spec';
import {BLESSED_PLUGINS, type BlessedPlugin} from '#plugin/blessed';
import {type Executor} from '#schema/executor';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type ReporterDef} from '#schema/reporter-def';
import {type RuleDef} from '#schema/rule-def';
import {type RuleDefSchemaValue} from '#schema/rule-def-schema-value';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type FileManager} from '#util/filemanager';
import Debug from 'debug';
import {isEmpty, isPlainObject, isString} from 'lodash';
import path from 'node:path';
import type {LiteralUnion, PackageJson, SetRequired} from 'type-fest';

const debug = Debug('midnight-smoker:plugin:metadata');

export interface PluginMetadataOpts {
  description?: string;

  /**
   * Path to plugin entry point. If a `string`, it should be absolute
   */
  entryPoint: LiteralUnion<typeof TRANSIENT, string>;
  id?: string;
  pkgJson?: PackageJson;
  requestedAs?: string;
  version?: string;
}

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
export class PluginMetadata implements StaticPluginMetadata {
  /**
   * @internal
   */
  public static readonly Transient = TRANSIENT;

  /**
   * Plugin description. May be derived from {@link pkgJson} or provided in
   * {@link PluginMetadataOpts}.
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
  public readonly executorMap: Map<string, Executor>;

  /**
   * {@inheritDoc StaticPluginMetadata.id}
   */
  public readonly id: string;

  /**
   * The contents of the plugin's `package.json`.
   */
  public readonly pkgJson?: PackageJson;

  /**
   * A map of package manager names to {@link PackageManager} objects contained
   * in the plugin
   *
   * @group Component Map
   */
  public readonly pkgManagerDefMap: Map<string, PkgManagerDef>;

  /**
   * A map of reporter names to {@link ReporterDef} objects contained in the
   * plugin
   *
   * @group Component Map
   */
  public readonly reporterDefMap: Map<string, ReporterDef>;

  /**
   * The name of the plugin as requested by the user
   */
  public readonly requestedAs: string;

  public readonly ruleDefMap: Map<string, SomeRuleDef>;

  /**
   * Version of plugin. May be derived from {@link pkgJson} or provided in
   * {@link PluginMetadataOpts}.
   */
  public readonly version?: string;

  /**
   * {@inheritDoc create:(0)}
   */
  protected constructor(entryPoint: string, id?: string);

  /**
   * {@inheritDoc create:(1)}
   */
  protected constructor(opts: PluginMetadataOpts);
  protected constructor(
    optsOrEntryPoint: PluginMetadataOpts | string,
    id?: string,
  ) {
    // this processing used to be a Zod schema, but it wasn't really necessary
    const opts: SetRequired<PluginMetadataOpts, 'id'> = isString(
      optsOrEntryPoint,
    )
      ? {
          entryPoint: optsOrEntryPoint,
          requestedAs: optsOrEntryPoint,
          id: id ?? path.basename(optsOrEntryPoint),
        }
      : {
          ...optsOrEntryPoint,
          id:
            optsOrEntryPoint.id ??
            optsOrEntryPoint.pkgJson?.name ??
            path.basename(optsOrEntryPoint.entryPoint),
        };

    if (opts.entryPoint !== TRANSIENT && !path.isAbsolute(opts.entryPoint)) {
      throw new InvalidArgError('entryPoint must be an absolute path', {
        argName: 'entryPoint',
      });
    }
    if (opts.pkgJson && !isPlainObject(opts.pkgJson)) {
      throw new InvalidArgError('pkgJson must be an object', {
        argName: 'pkgJson',
      });
    }

    // basic information
    this.id = opts.id;
    this.requestedAs = opts.requestedAs ?? opts.entryPoint;
    this.entryPoint = opts.entryPoint;
    this.pkgJson = opts.pkgJson;
    this.description = opts.description || opts.pkgJson?.description;

    // component maps
    this.pkgManagerDefMap = new Map();
    this.executorMap = new Map();
    this.reporterDefMap = new Map();
    this.ruleDefMap = new Map();
    this.version = this.version ?? this.pkgJson?.version;
  }

  public get isBlessed(): boolean {
    return BLESSED_PLUGINS.includes(this.id as BlessedPlugin);
  }

  public get pkgManagerDefs(): PkgManagerDef[] {
    return [...this.pkgManagerDefMap.values()];
  }

  public get pkgManagerNames(): string[] {
    return this.pkgManagerDefs.map(({name}) => name);
  }

  public get reporterDefs(): ReporterDef[] {
    return [...this.reporterDefMap.values()];
  }

  public get reporterNames(): string[] {
    return this.reporterDefs.map(({name}) => name);
  }

  public get ruleDefs(): SomeRuleDef[] {
    return [...this.ruleDefMap.values()];
  }

  public get ruleNames(): string[] {
    return this.ruleDefs.map(({name}) => name);
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
   * Creates a new {@link PluginMetadata} from a {@link PluginMetadataOpts}
   * object.
   *
   * @param opts - {@link PluginMetadataOpts}
   * @returns - A new {@link PluginMetadata} instance
   * @internal
   */
  public static create(opts: PluginMetadataOpts): Readonly<PluginMetadata>;

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
    opts: Partial<PluginMetadataOpts> | string,
  ): Readonly<PluginMetadata>;
  public static create(
    optsEntryPtOrMetadata:
      | PluginMetadataOpts
      | string
      | Readonly<PluginMetadata>,
    idOrOpts?: string | Partial<PluginMetadataOpts>,
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
   *
   * @internal
   */
  public static createTransient(
    name: string,
    pkg?: PackageJson,
  ): Readonly<PluginMetadata> {
    if (!name) {
      throw new InvalidArgError(
        'name is required when creating a transient PluginMetadata instance',
        {argName: 'name'},
      );
    }
    return PluginMetadata.create({
      id: name,
      entryPoint: PluginMetadata.Transient,
      pkgJson: pkg,
    });
  }

  public addExecutor(name: string, value: Executor): void {
    this.executorMap.set(name, value);
    debug('%s added Executor: %s', this, name);
  }

  /**
   * Adds a {@link PkgManagerDef} to the plugin's component map.
   *
   * Should only be called within a `DefinePkgManagerFn` post-validation and
   * registration.
   *
   * @param value Package manager definition
   * @internal
   */
  public addPkgManagerDef(value: PkgManagerDef): void {
    this.pkgManagerDefMap.set(value.name, value);
    debug('%s added PkgManagerDef: %s', this, value.name);
  }

  /**
   * Adds a {@link ReporterDef} to the plugin's component map.
   *
   * Should only be called within a `DefineReporterFn` post-validation and
   * registration.
   *
   * @param value Reporter definition
   * @internal
   */
  public addReporterDef(value: ReporterDef): void {
    this.reporterDefMap.set(value.name, value);
    debug('%s added ReporterDef: %s', this, value.name);
  }

  /**
   * Adds a {@link RuleDef} to the plugin's component map.
   *
   * Should only be called within a `DefineRuleFn` post-validation and
   * registration.
   *
   * @param value Rule definition
   * @internal
   */
  public addRuleDef<Schema extends RuleDefSchemaValue | void = void>(
    def: RuleDef<Schema>,
  ): void {
    const {name} = def;
    this.ruleDefMap.set(name, def);
    debug('%s added RuleDef: %s', this, name);
  }

  /**
   * Loads package managers from this plugin, choosing only those that match the
   * desired package managers.
   *
   * This method should not be called if the plugin does not provide any package
   * managers.
   *
   * @param workspaceInfo
   * @param opts
   * @returns
   * @internal
   */
  public async loadPkgManagers(
    workspaceInfo: WorkspaceInfo[],
    opts: LoadPackageManagersOpts,
  ): Promise<PkgManagerDefSpec[]> {
    const defs = [...this.pkgManagerDefMap.values()];
    if (isEmpty(defs)) {
      return [];
    }
    return loadPackageManagers(defs, workspaceInfo, opts);
  }

  /**
   * Serializes this object to a brief {@link StaticPluginMetadata} object.
   */
  public toJSON(): StaticPluginMetadata {
    return {
      id: this.id,
      version: this.version,
      description: this.description,
      entryPoint: this.entryPoint,
      ruleNames: this.ruleNames,
      pkgManagerNames: this.pkgManagerNames,
      reporterNames: this.reporterNames,
    };
  }

  /**
   * Returns a string representation of this metadata
   */
  public toString(): string {
    return `[Plugin ${this.id}${this.version ? `@${this.version}` : ''}]`;
  }
}

export type {LiteralUnion};

/**
 * Pre-builds the plugin metadata for "blessed" plugins so that they cannot be
 * overridden by 3rd party plugins.
 *
 * That's the idea anyway. Should be called by a `PluginRegistry` instance.
 *
 * @internal
 * @todo The `pkgJson` property loads `midnight-smoker`'s `package.json`, which
 *   is incorrect. It should load the `package.json` of each
 *   {@link BLESSED_PLUGINS blessed plugin}.
 *
 * @todo Should probably memoize/singleton-ize this, so that _every_
 *   `PluginRegistry` instance gets the same one. That isn't the same as "this
 *   should only run once"--it should run once per `PluginRegistry` instance.
 *
 * @todo Move this somewhere else
 */
export async function initBlessedMetadata(fm: FileManager) {
  const entries = await Promise.all(
    BLESSED_PLUGINS.map(async (id) => {
      const {packageJson: pkgJson} = await fm.findPkgUp(
        path.dirname(require.resolve(id)),
        {
          strict: true,
        },
      );
      return [
        id,
        PluginMetadata.create({
          id,
          requestedAs: id,
          entryPoint: require.resolve(id),
          pkgJson,
        }),
      ];
    }),
  );

  return Object.freeze(Object.fromEntries(entries)) as Readonly<
    Record<BlessedPlugin, PluginMetadata>
  >;
}
