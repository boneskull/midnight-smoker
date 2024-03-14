/**
 * Provides a wrapper around a plugin.
 *
 * @packageDocumentation
 * @see {@link PluginMetadata}
 */
import {isZodError} from '#error/base-error';
import {InvalidArgError} from '#error/invalid-arg-error';
import {
  loadPackageManagers,
  type LoadPackageManagersOpts,
} from '#pkg-manager/pkg-manager-loader';
import {BLESSED_PLUGINS, type BlessedPlugin} from '#plugin/blessed';
import type {StaticPluginMetadata} from '#plugin/static-metadata';
import type {Executor} from '#schema/executor';
import type {PkgManagerDef} from '#schema/pkg-manager-def';
import type {ReporterDef} from '#schema/reporter-def';
import {type SomeRule} from '#schema/rule';
import {type RuleDef, type SomeRuleDef} from '#schema/rule-def';
import {type RuleDefSchemaValue} from '#schema/rule-options';
import {readPackageJson} from '#util/pkg-util';
import {NonEmptyStringSchema, PackageJsonSchema} from '#util/schema-util';
import Debug from 'debug';
import {isString} from 'lodash';
import path from 'node:path';
import type {LiteralUnion, PackageJson} from 'type-fest';
import {z} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {type PkgManagerDefSpec} from '../component/schema/pkg-manager-def-spec';
import {assertNonEmptyArray, type NonEmptyArray} from '../util';

const debug = Debug('midnight-smoker:plugin:metadata');

/**
 * Serves as the {@link entryPoint} for plugins which exist only in memory (as
 * far as this package is concerned)
 *
 * @internal
 */
export const TRANSIENT = '<transient>';

/**
 * Plugin ID.
 */
const zId = NonEmptyStringSchema.describe(
  'The plugin (package) name, derived from its `package.json` if possible',
);

/**
 * Validation for {@link PluginMetadataOpts} as optionally passsed to
 * {@link PluginMetadata.create}
 */
const zPluginMetadataOptsInput = z.object({
  entryPoint: z
    .literal(TRANSIENT)
    .or(
      NonEmptyStringSchema.refine((entryPoint) => path.isAbsolute(entryPoint), {
        message: 'Must be an absolute path',
      }),
    )
    .describe('The entry point of the plugin as an absolute path'),
  description: NonEmptyStringSchema.optional().describe('Plugin description'),
  version: NonEmptyStringSchema.optional().describe('Plugin version'),
  id: zId.optional(),
  requestedAs: NonEmptyStringSchema.optional().describe(
    'The module name as requested by the user. Must be resolvable by Node.js and may differ from id',
  ),
  pkgJson: PackageJsonSchema.optional(),
});

/**
 * If `id` is undefined, this sets the `id` prop to a relative path based on the
 * `entryPoint` prop.
 *
 * It needs to alter the schema to declare that `id` is no longer optional
 * (allowed to be `undefined`)
 *
 * @todo Is there a better way to do this?
 */
export const zPluginMetadataOpts = zPluginMetadataOptsInput
  .transform((opts) =>
    opts.entryPoint === TRANSIENT
      ? opts
      : {
          ...opts,
          id:
            opts.id ??
            opts.pkgJson?.name ??
            path.relative(process.cwd(), opts.entryPoint),
        },
  )
  // `id` no longer optional
  .pipe(zPluginMetadataOptsInput.setKey('id', zId))
  .describe('Options for PluginMetadata.create()');

/**
 * Options for {@link PluginMetadata.create}
 */
export type PluginMetadataOpts = z.input<typeof zPluginMetadataOpts>;

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
   * {@inheritDoc }
   *
   * @internal
   */
  public static readonly Transient = TRANSIENT;

  /**
   * Plugin entry point. Usually a path and resolved from {@link requestedAs}.
   */
  public readonly entryPoint: LiteralUnion<typeof TRANSIENT, string>;

  /**
   * {@inheritDoc StaticPluginMetadata.id}
   */
  public readonly id: string;

  /**
   * The name of the plugin as requested by the user
   */
  public readonly requestedAs: string;

  /**
   * The contents of the plugin's `package.json`.
   */
  public readonly pkgJson?: PackageJson;

  /**
   * A map of rule names to {@link SomeRule} objects contained in the plugin
   *
   * @group Component Map
   */
  public readonly ruleMap: Map<string, SomeRule>;

  public readonly ruleDefMap: Map<string, SomeRuleDef>;

  /**
   * A map of package manager names to {@link PackageManager} objects contained
   * in the plugin
   *
   * @group Component Map
   */
  public readonly pkgManagerDefMap: Map<string, PkgManagerDef>;

  /**
   * A map of executor names to {@link SomeExecutor} objects contained in the
   * plugin
   *
   * @group Component Map
   */
  public readonly executorMap: Map<string, Executor>;

  /**
   * A map of reporter names to {@link ReporterDef} objects contained in the
   * plugin
   *
   * @group Component Map
   */
  public readonly reporterDefMap: Map<string, ReporterDef>;

  /**
   * Plugin description. May be derived from {@link pkgJson} or provided in
   * {@link PluginMetadataOpts}.
   */
  public readonly description?: string;

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
    try {
      const opts = isString(optsOrEntryPoint)
        ? zPluginMetadataOpts.parse({
            entryPoint: optsOrEntryPoint,
            requestedAs: optsOrEntryPoint,
            id,
          })
        : zPluginMetadataOpts.parse(optsOrEntryPoint);

      // basic information
      this.id = opts.id;
      this.requestedAs = opts.requestedAs ?? opts.entryPoint;
      this.entryPoint = opts.entryPoint;
      this.pkgJson = opts.pkgJson;
      this.description = opts.description || opts.pkgJson?.description;

      // component maps
      this.ruleMap = new Map();
      this.pkgManagerDefMap = new Map();
      this.executorMap = new Map();
      this.reporterDefMap = new Map();
      this.ruleDefMap = new Map();
      this.version = this.version ?? this.pkgJson?.version;
    } catch (err) {
      // TODO: throw SmokerError
      throw isZodError(err) ? fromZodError(err) : err;
    }
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
   * Returns {@link Rule} components within this plugin, if any
   */
  public get rules() {
    return [...this.ruleMap.values()];
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

  public get isBlessed() {
    return BLESSED_PLUGINS.includes(this.id as BlessedPlugin);
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
    };
  }

  /**
   * Returns a string representation of this metadata
   */
  public toString(): string {
    return `[PluginMetadata] ${this.id}${
      this.version ? `@${this.version}` : ''
    } (${this.entryPoint})`;
  }

  /**
   * Should only be called within a `DefinePkgManagerFn`
   *
   * @internal
   */
  public addPkgManagerDef(name: string, value: PkgManagerDef): void {
    this.pkgManagerDefMap.set(name, value);
    debug('Plugin %s added pkg manager "%s"', this, name);
  }

  public addRuleDef<Schema extends RuleDefSchemaValue | void = void>(
    def: RuleDef<Schema>,
  ): void {
    const {name} = def;
    this.ruleDefMap.set(name, def);
  }

  public addExecutor(name: string, value: Executor): void {
    this.executorMap.set(name, value);
  }

  public addReporterDef(value: ReporterDef): void {
    this.reporterDefMap.set(value.name, value);
  }

  public async loadPkgManagers(
    opts: LoadPackageManagersOpts,
  ): Promise<NonEmptyArray<PkgManagerDefSpec>> {
    const pkgManagerDefs = [...this.pkgManagerDefMap.values()];
    assertNonEmptyArray(pkgManagerDefs);
    return loadPackageManagers(pkgManagerDefs, opts);
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
 */
export async function initBlessedMetadata() {
  const entries = await Promise.all(
    BLESSED_PLUGINS.map(async (id) => {
      const {packageJson: pkgJson} = await readPackageJson({
        cwd: require.resolve(id),
        strict: true,
      });
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
