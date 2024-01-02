/**
 * Provides a wrapper around a plugin.
 *
 * @packageDocumentation
 * @see {@link PluginMetadata}
 */
import Debug from 'debug';
import {isString} from 'lodash';
import path from 'node:path';
import {PackageJson, type LiteralUnion} from 'type-fest';
import {z} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {component, type Component} from '../component/component';
import {ComponentKinds} from '../component/component-kind';
import {type Executor} from '../component/executor';
import {type PackageManagerModule} from '../component/package-manager/pkg-manager-types';
import type {ReporterDef} from '../component/reporter/reporter-types';
import {
  Rule,
  type RuleDef,
  type RuleOptionSchema,
  type SomeRule,
} from '../component/rule/rule';
import {type RuleRunner} from '../component/schema/rule-runner-schema';
import type {ScriptRunner} from '../component/schema/script-runner-schema';
import {InvalidArgError} from '../error/common-error';
import {ComponentNameError} from '../error/component-error';
import {readPackageJson} from '../pkg-util';
import {zNonEmptyString, zPackageJson} from '../schema-util';
import {BLESSED_PLUGINS, type BlessedPlugin} from './blessed';
import {StaticPluginMetadata} from './static-metadata';

const debug = Debug('midnight-smoker:plugin:metadata');

/**
 * Used as the {@link PluginMetadata.entryPoint} for in-memory plugins
 */
export const TRANSIENT = '<transient>';

/**
 * Plugin ID.
 */
const zId = zNonEmptyString.describe(
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
      zNonEmptyString.refine((entryPoint) => path.isAbsolute(entryPoint), {
        message: 'Must be an absolute path',
      }),
    )
    .describe('The entry point of the plugin as an absolute path'),
  description: zNonEmptyString.optional().describe('Plugin description'),
  id: zId.optional(),
  requestedAs: zNonEmptyString
    .optional()
    .describe(
      'The module name as requested by the user. Must be resolvable by Node.js and may differ from id',
    ),
  pkgJson: zPackageJson.optional(),
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
   * Serves as the {@link entryPoint} for plugins which exist only in memory (as
   * far as this package is concerned)
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
  public readonly ruleMap: Map<string, Component<SomeRule>>;

  /**
   * A map of package manager names to {@link PackageManager} objects contained
   * in the plugin
   *
   * @group Component Map
   */
  public readonly pkgManagerModuleMap: Map<
    string,
    Component<PackageManagerModule>
  >;

  /**
   * A map of script runner names to {@link ScriptRunner} objects contained in
   * the plugin
   *
   * @group Component Map
   */

  public readonly scriptRunnerMap: Map<string, Component<ScriptRunner>>;

  /**
   * A map of rule runner names to {@link RuleRunner} objects contained in the
   * plugin
   *
   * @group Component Map
   */
  public readonly ruleRunnerMap: Map<string, Component<RuleRunner>>;

  /**
   * A map of executor names to {@link SomeExecutor} objects contained in the
   * plugin
   *
   * @group Component Map
   */
  public readonly executorMap: Map<string, Component<Executor>>;

  /**
   * A map of reporter names to {@link ReporterDef} objects contained in the
   * plugin
   *
   * @group Component Map
   */
  public readonly reporterMap: Map<string, Component<ReporterDef>>;

  /**
   * Plugin description. May be derived from {@link pkgJson} or provided in
   * {@link PluginMetadataOpts}.
   */
  public readonly description?: string;

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
      this.pkgManagerModuleMap = new Map();
      this.scriptRunnerMap = new Map();
      this.ruleRunnerMap = new Map();
      this.executorMap = new Map();
      this.reporterMap = new Map();
    } catch (err) {
      // TODO: throw SmokerError
      throw fromZodError(err as z.ZodError);
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
    metadata: PluginMetadata,
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
    } else if (optsEntryPtOrMetadata instanceof PluginMetadata) {
      const opts = isString(idOrOpts) ? {id: idOrOpts} : idOrOpts ?? {};
      metadata = new PluginMetadata({...optsEntryPtOrMetadata, ...opts});
    } else {
      metadata = new PluginMetadata(optsEntryPtOrMetadata);
    }

    return Object.freeze(metadata);
  }

  /**
   * {@inheritDoc StaticPluginMetadata.version}
   */
  public get version(): string | undefined {
    return this.pkgJson?.version;
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
  ): PluginMetadata {
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
    return `${this.id}${this.version ? `@${this.version}` : ''} (${
      this.entryPoint
    })`;
  }

  /**
   * Should only be called within a `DefinePkgManagerFn`
   *
   * @internal
   */
  public addPackageManagerModule(
    name: string,
    value: PackageManagerModule,
  ): void {
    if (this.pkgManagerModuleMap.has(name)) {
      throw new ComponentNameError(
        `Package manager with name "${name}" already exists in plugin ${this}`,
        this.id,
        name,
      );
    }
    this.pkgManagerModuleMap.set(
      name,
      component({
        name,
        value,
        owner: this,
        kind: ComponentKinds.PkgManagerModule,
      }),
    );
  }

  public addScriptRunner(name: string, value: ScriptRunner): void {
    if (this.scriptRunnerMap.has(name)) {
      throw new ComponentNameError(
        `Script runner with name "${name}" already exists in plugin ${this}`,
        this.id,
        name,
      );
    }
    this.scriptRunnerMap.set(
      name,
      component({name, value, owner: this, kind: ComponentKinds.ScriptRunner}),
    );

    debug('Plugin %s added script runner "%s"', this, name);
  }

  public addRuleRunner(name: string, value: RuleRunner): void {
    if (this.ruleRunnerMap.has(name)) {
      throw new ComponentNameError(
        `Rule runner with name "${name}" already exists in plugin ${this}`,
        this.id,
        name,
      );
    }
    this.ruleRunnerMap.set(
      name,
      component({name, value, owner: this, kind: ComponentKinds.RuleRunner}),
    );
  }

  public addRule<
    const Name extends string,
    Schema extends RuleOptionSchema | void = void,
  >(ruleDef: RuleDef<Name, Schema>): void {
    const {name} = ruleDef;
    const rule = Rule.create(ruleDef, this);
    if (this.ruleMap.has(name)) {
      throw new ComponentNameError(
        `Rule with name "${name}" already exists in plugin ${this}`,
        this.id,
        name,
      );
    }
    this.ruleMap.set(name, rule);
  }

  public addExecutor(name: string, value: Executor): void {
    if (this.executorMap.has(name)) {
      throw new ComponentNameError(
        `Executor with name "${name}" already exists in plugin ${this}`,
        this.id,
        name,
      );
    }
    this.executorMap.set(
      name,
      component({name, value, owner: this, kind: ComponentKinds.Executor}),
    );
  }

  public addReporter(value: ReporterDef): void {
    if (this.reporterMap.has(value.name)) {
      throw new ComponentNameError(
        `Reporter with name "${value.name}" already exists in plugin ${this}`,
        this.id,
        value.name,
      );
    }
    this.reporterMap.set(
      value.name,
      component({
        name: value.name,
        value,
        owner: this,
        kind: ComponentKinds.Reporter,
      }),
    );
  }
}

export {LiteralUnion};

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
