import {
  ComponentKinds,
  DEFAULT_COMPONENT_ID,
  RuleSeverities,
  type ComponentKind,
} from '#constants';
import * as Errors from '#error/meta/for-plugin-registry';
import {createPluginAPI} from '#plugin/create-plugin-api';
import {PluginMetadata, initBlessedMetadata} from '#plugin/plugin-metadata';
import {getDefaultRuleOptions} from '#rule/default-rule-options';
import * as Schemas from '#schema/meta/for-plugin-registry';
import {once} from '#util/decorator';
import {isErrnoException} from '#util/error-util';
import {FileManager} from '#util/filemanager';
import {justImport, resolveFrom} from '#util/loader-util';
import {
  EmptyObjectSchema,
  NonEmptyNonEmptyStringArraySchema,
} from '#util/schema-util';
import Debug from 'debug';
import {isEmpty, isError, isString} from 'lodash';
import {dirname} from 'node:path';
import util from 'node:util';
import {type PackageJson} from 'type-fest';
import {z, type ZodError} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {isBlessedPlugin, type BlessedPlugin} from './blessed';
import {
  type Component,
  type ComponentObject,
  type SomeComponent,
  type SomeComponentObject,
} from './component';

export interface PluginRegistryCapabilities {
  fileManager?: FileManager;
}

/**
 * Static metadata about a {@link PluginRegistry}
 *
 * @see {@link PluginRegistry.toJSON}
 */
export interface StaticPluginRegistry {
  plugins: Schemas.StaticPluginMetadata[];
}

export class PluginRegistry {
  #blessedMetadata?: Readonly<Record<BlessedPlugin, PluginMetadata>>;

  #componentRegistry: WeakMap<SomeComponentObject, Readonly<SomeComponent>>;

  #defsByKind = {
    [ComponentKinds.RuleDef]: new Map<string, Schemas.SomeRuleDef>(),
    [ComponentKinds.ReporterDef]: new Map<string, Schemas.ReporterDef>(),
    [ComponentKinds.PkgManagerDef]: new Map<string, Schemas.PkgManagerDef>(),
    [ComponentKinds.Executor]: new Map<string, Schemas.Executor>(),
  } as const;

  #fileManager: FileManager;

  #isClosed = false;

  #pluginMap: Map<string, Readonly<PluginMetadata>>;

  #seenRawPlugins: Map<unknown, string>;

  public constructor({
    fileManager = FileManager.create(),
  }: PluginRegistryCapabilities = {}) {
    this.#pluginMap = new Map();
    this.#seenRawPlugins = new Map();
    this.#fileManager = fileManager;
    this.#componentRegistry = new WeakMap();
  }

  /**
   * Whether the registry is closed
   */
  public get isClosed(): boolean {
    return this.#isClosed;
  }

  /**
   * All plugins in the registry
   */
  public get plugins(): Readonly<PluginMetadata>[] {
    return [...this.#pluginMap.values()];
  }

  /**
   * Instantiates a new {@link PluginRegistry}
   *
   * @param caps Capabilities
   * @returns New {@link PluginRegistry}
   */
  public static create(caps?: PluginRegistryCapabilities): PluginRegistry {
    return new PluginRegistry(caps);
  }

  /**
   * Given the export(s) of a plugin's entry point, validate it and return a
   * {@link Schemas.Plugin}.
   */
  public static normalizePlugin(rawPlugin: unknown): Schemas.Plugin {
    try {
      return Schemas.PluginSchema.parse(rawPlugin);
    } catch (err) {
      throw fromZodError(err as ZodError);
    }
  }

  public buildRuleOptions() {
    const MergedRuleOptionSchema = this.mergeRuleSchemas();
    const defaults = this.mergeRuleDefaults();
    return MergedRuleOptionSchema.default(defaults);
  }

  /**
   * Clears all plugins from the registry and resets ~~all~~ most internal
   * state.
   *
   * Does not reset decorated methods
   *
   * @internal
   */
  public clear(): void {
    this.#pluginMap.clear();
    this.#seenRawPlugins.clear();
    this.#componentRegistry = new WeakMap();
    for (const kind of Object.keys(this.#defsByKind)) {
      this.#defsByKind[kind as ComponentKind].clear();
    }
    this.#isClosed = false;
  }

  /**
   * Closes the registry, preventing further plugins from being registered.
   *
   * @internal
   */
  public close() {
    this.#seenRawPlugins.clear();
    this.#isClosed = true;
  }

  /**
   * Returns entry-style tuple of {@link Schemas.SomeRuleDef.id} and
   * {@link Schemas.SomeRuleDef} for enabled rules only.
   *
   * @param configs Rule configuration (`SmokerOptions.rules`)
   * @param plugin Optional plugin to filter on
   * @returns All enabled rules or all enabled rules from a specific plugin
   * @internal
   */
  public enabledRuleDefs(
    configs: Schemas.BaseRuleConfigRecord,
    plugin?: Readonly<PluginMetadata>,
  ): [id: string, ruleDef: Schemas.SomeRuleDef][] {
    const allRuleDefs = plugin
      ? plugin.ruleDefs
      : [...this.#defsByKind[ComponentKinds.RuleDef].values()];

    return allRuleDefs.reduce<[id: string, ruleDef: Schemas.SomeRuleDef][]>(
      (acc, def) => {
        const id = this.getComponentId(def);
        if (configs[id]?.severity !== RuleSeverities.Off) {
          acc = [...acc, [id, def]];
        }
        return acc;
      },
      [],
    );
  }

  /**
   * Gets metadata for blessed plugins
   *
   * @returns Metadata for blessed plugins
   * @internal
   */
  @once
  public async getBlessedMetadata(): Promise<
    Readonly<Record<BlessedPlugin, PluginMetadata>>
  > {
    if (this.#blessedMetadata) {
      return this.#blessedMetadata;
    }
    this.#blessedMetadata = await initBlessedMetadata(this.#fileManager);
    return this.#blessedMetadata;
  }

  /**
   * Gets a {@link Component} for a {@link ComponentObject}
   *
   * @param def A component object (definition)
   * @returns Component
   * @internal
   */
  public getComponent<T extends ComponentKind>(
    def: ComponentObject<T>,
  ): Component<T> {
    if (this.#componentRegistry.has(def)) {
      return this.#componentRegistry.get(def) as Component<T>;
    }
    throw new Errors.InvalidComponentError('Component not found', def);
  }

  /**
   * Looks up a component ID by its definition
   *
   * @param def A component object (definition)
   * @returns Component ID
   * @internal
   */
  public getComponentId<T extends ComponentKind>(
    def: ComponentObject<T>,
  ): string {
    return this.getComponent(def).id;
  }

  /**
   * Gets an {@link Executor} by ID
   *
   * @param componentId Executor ID
   * @returns A registered `Executor`
   * @internal
   */
  public getExecutor(componentId = DEFAULT_COMPONENT_ID): Schemas.Executor {
    const value = this.#defsByKind[ComponentKinds.Executor].get(componentId);

    if (!value) {
      throw new Errors.InvalidComponentError(
        `Executor with component ID ${componentId} not found`,
        componentId,
      );
    }
    return value;
  }

  /**
   * Merges all rule option defaults into a single object, which becomes the
   * default value of the `rules` prop of `SmokerOptions`.
   *
   * This is needed because `rules` can be `undefined`, and if it is _not_ an
   * object, then the per-option defaults will not be applied.
   *
   * @internal
   */
  public mergeRuleDefaults(): Record<string, unknown> {
    return this.plugins.reduce(
      (defaults, metadata) =>
        metadata.ruleDefs.reduce((acc, anyRule) => {
          const id = this.getComponentId(anyRule);
          const defaultOptions =
            'schema' in anyRule && anyRule.schema
              ? getDefaultRuleOptions(anyRule.schema)
              : {};
          return {
            ...acc,
            [id]: defaultOptions,
          };
        }, defaults),
      {},
    );
  }

  /**
   * Merges all rule option schemas from all loaded plugins into a single
   * schema, which becomes the `rules` prop of `SmokerOptions`.
   *
   * Zod's `catchall` is used here in the case of rules which do not define
   * options; those options will be passed into the {@link zBaseRuleOptions}
   * schema which passes options through verbatim.
   *
   * @returns A Zod schema representing the merged rule schemas--options _and_
   *   severity--of all loaded plugins
   * @internal
   * @todo This might want to move adjacent to `OptionsParser`
   */
  public mergeRuleSchemas() {
    return this.plugins
      .reduce(
        (pluginRuleSchema, metadata) =>
          pluginRuleSchema.merge(
            metadata.ruleDefs.reduce((ruleSchema, ruleDef) => {
              const id = this.getComponentId(ruleDef);
              const schema = ruleDef.schema
                ? Schemas.createRuleOptionsSchema(
                    ruleDef.schema,
                    ruleDef.defaultSeverity,
                  )
                : Schemas.createRuleOptionsSchema(
                    EmptyObjectSchema,
                    ruleDef.defaultSeverity,
                  );
              return ruleSchema.setKey(id, schema);
            }, z.object({}).catchall(Schemas.RawRuleOptionsSchema)),
          ),
        z.object({}).catchall(Schemas.RawRuleOptionsSchema),
      )
      .describe('Rule configuration for automated checks');
  }

  /**
   * Registers a component object
   *
   * @param plugin Plugin metadata owning the component object
   * @param kind Component kind
   * @param def Component object
   * @param name Component name (unique to plugin & kind)
   * @returns Registered component
   */
  private registerComponent<T extends ComponentKind>(
    plugin: Readonly<PluginMetadata>,
    kind: T,
    def: ComponentObject<T>,
    name?: string,
  ): void {
    const component = this.createComponent(plugin, kind, name);

    this.#componentRegistry.set(def, component);

    const map = this.getDefsByKind(kind);
    map.set(component.id, def);
  }

  /**
   * Registers a plugin "manually"
   *
   * @param entryPoint - Module ID of plugin entry point; something resolvable
   * @param name - Plugin name (useful if a relative path is provided for
   *   `entryPoint`)
   * @returns Metadata containing rules, if any
   */
  public async registerPlugin(
    entryPoint: string,
    name?: string,
  ): Promise<Readonly<PluginMetadata>>;

  /**
   * Registers a plugin from metadata; this is the usual flow.
   *
   * @param metadata - Already-created {@link PluginMetadata} object
   * @param plugin - Already-loaded, normalized plugin object
   */
  public async registerPlugin(
    metadata: Readonly<PluginMetadata>,
    plugin?: Schemas.Plugin,
  ): Promise<Readonly<PluginMetadata>>;

  /**
   * Registers a plugin from a name and a plugin object; this is used by the
   * plugin test API.
   *
   * @param name - Plugin name
   * @param plugin - Already-loaded, normalized plugin object
   */
  public async registerPlugin(
    name: string,
    plugin: Schemas.Plugin,
  ): Promise<Readonly<PluginMetadata>>;
  public async registerPlugin(
    metadataOrName: Readonly<PluginMetadata> | string,
    nameOrPlugin?: string | Schemas.Plugin,
  ): Promise<Readonly<PluginMetadata>> {
    if (this.isClosed) {
      throw new Errors.DisallowedPluginError();
    }

    let plugin: Schemas.Plugin | undefined;
    let metadata: Readonly<PluginMetadata>;

    if (isString(metadataOrName)) {
      // in this case, we have a "transient" plugin, which is something that we
      // aren't pulling from disk ourselves, but rather exists in-memory.
      // currently not possible to use this functionality outside of a test context.
      if (typeof nameOrPlugin === 'object') {
        plugin = nameOrPlugin;
        const pkg: PackageJson = {};
        if (plugin.name) {
          pkg.name = plugin.name;
        }
        if (plugin.description) {
          pkg.description = plugin.description;
        }
        if (plugin.version) {
          pkg.version = plugin.version;
        }
        metadata = PluginMetadata.createTransient(
          metadataOrName,
          isEmpty(pkg) ? undefined : pkg,
        );
      } else {
        metadata = PluginMetadata.create({
          entryPoint: metadataOrName,
          id: nameOrPlugin ?? metadataOrName,
        });
      }
    } else {
      if (typeof nameOrPlugin === 'object') {
        plugin = nameOrPlugin;
      }
      metadata = metadataOrName;
    }

    if (this.#pluginMap.has(metadata.id)) {
      const existingMetadata = this.#pluginMap.get(metadata.id)!;
      throw new Errors.PluginConflictError(existingMetadata, metadata);
    }

    if (plugin === undefined) {
      let rawPlugin: unknown;
      try {
        rawPlugin = await justImport(metadata.entryPoint);
      } catch (err) {
        throw isError(err) ? new Errors.PluginImportError(err, metadata) : err;
      }
      if (this.#seenRawPlugins.has(rawPlugin)) {
        throw new Errors.DuplicatePluginError(
          this.#seenRawPlugins.get(rawPlugin)!,
          metadata.id,
        );
      }
      plugin = PluginRegistry.normalizePlugin(rawPlugin);
      this.#seenRawPlugins.set(rawPlugin, metadata.id);
    } else if (this.#seenRawPlugins.has(plugin)) {
      throw new Errors.DuplicatePluginError(
        this.#seenRawPlugins.get(plugin)!,
        metadata.id,
      );
    } else {
      this.#seenRawPlugins.set(plugin, metadata.id);
    }

    metadata = this.maybeUpdatePluginMetadata(metadata, plugin);

    const registerComponent = this.registerComponent.bind(this, metadata);

    const getPlugins = () => this.plugins;

    const pluginApi = createPluginAPI(registerComponent, getPlugins, metadata);

    try {
      await plugin.plugin(pluginApi);
    } catch (err) {
      debug(err);
      throw isError(err) ? new Errors.PluginInitError(err, metadata) : err;
    }

    this.#pluginMap.set(metadata.id, metadata);

    debug('Loaded plugin successfully: %s', metadata);

    return metadata;
  }

  /**
   * Registers all plugins
   *
   * @param cwd Current working directory
   * @returns This {@link PluginRegistry}
   */
  public async registerPlugins(
    pluginIds: readonly string[] | string[] = [],
    cwd?: string,
  ): Promise<this> {
    if (!pluginIds.length) {
      return this;
    }

    pluginIds = this.validateRequestedPluginIds([...pluginIds]);

    debug('Loading plugin(s): %O', pluginIds);

    await Promise.all(
      pluginIds.map(async (plugin) => {
        try {
          const metadata = await this.resolvePlugin(plugin, cwd);
          await this.registerPlugin(metadata);
        } catch (err) {
          // TODO: throw SmokeError instead
          if (err instanceof z.ZodError) {
            throw fromZodError(err);
          }
          throw err;
        }
      }),
    );

    return this;
  }

  public toJSON(): StaticPluginRegistry {
    return {
      plugins: this.plugins,
    };
  }

  public toString() {
    return util.format('%O', this.toJSON());
  }

  private createComponent<T extends ComponentKind>(
    plugin: Readonly<PluginMetadata>,
    kind: T,
    componentName = DEFAULT_COMPONENT_ID,
  ): Readonly<Component<T>> {
    const pluginName = plugin.id;
    const isBlessed = isBlessedPlugin(pluginName);
    const id = isBlessed
      ? componentName
      : `${pluginName}/${componentName ?? DEFAULT_COMPONENT_ID}`;
    return Object.freeze({
      id,
      kind,
      pluginName,
      componentName,
      isBlessed,
      plugin: plugin.toJSON(),
    });
  }

  /**
   * Returns a map of defs by component kind
   *
   * @param kind Component kind
   * @returns Map of component ID to component object
   */
  private getDefsByKind<T extends ComponentKind>(
    kind: T,
  ): Map<string, ComponentObject<T>> {
    return this.#defsByKind[kind] as Map<string, ComponentObject<T>>;
  }

  /**
   * Maybe creates a new {@link PluginMetadata} object, depending on the
   * `plugin`.
   *
   * At time of {@link resolvePlugin resolution}, the metadata's `id` is derived
   * from the `name` field of its ancestor `package.json`, and the `description`
   * is derived from that as well. However, a {@link Schemas.Plugin} can provide
   * a `name` and `description` field, which should override the metadata's `id`
   * and `description` fields. {@link PluginMetadata} objects are readonly, so we
   * have to create a new one. This is allowed, because the metadata is not yet
   * stored in {@link PluginRegistry.#pluginMap}.
   *
   * Note that {@link Schemas.Plugin.name} maps to {@link PluginMetadata.id}.
   *
   * @param metadata - Plugin metadata
   * @param plugin - A plugin object
   * @returns Either the original metadata or new metadata with updated `id` and
   *   `description` fields.
   */
  private maybeUpdatePluginMetadata(
    metadata: Readonly<PluginMetadata>,
    plugin?: Schemas.Plugin,
  ): Readonly<PluginMetadata> {
    if (plugin?.name || plugin?.description || plugin?.version) {
      const updates = {
        id: plugin.name ?? metadata.id,
        description: plugin.description ?? metadata.description,
        version: plugin.version ?? metadata.version,
      };
      return PluginMetadata.create(metadata, updates);
    }
    return metadata;
  }

  /**
   * Resolves a plugin by name and creates {@link PluginMetadata} for it (if
   * found).
   *
   * First, it attempts to resolve from the provided `cwd`. If that fails, it
   * attempts to resolve from _this_ file.
   *
   * @param pluginSpecifier - Plugin specifier; can be a resolvable module ID,
   *   filepath, etc.
   * @param cwd - Current working directory
   */
  private async resolvePlugin(
    pluginSpecifier: string,
    cwd = process.cwd(),
  ): Promise<Readonly<PluginMetadata>> {
    let entryPoint: string | undefined;

    const tryResolve = (from: string) => {
      try {
        return resolveFrom(pluginSpecifier, cwd);
      } catch (err) {
        if (isErrnoException(err)) {
          if (err.code !== 'MODULE_NOT_FOUND') {
            throw new Errors.PluginResolutionError(err, pluginSpecifier, from);
          }
        } else {
          throw err;
        }
      }
    };

    const tried: string[] = [];
    if (!entryPoint) {
      entryPoint = tryResolve(cwd);
      tried.push(cwd);
    }
    if (!entryPoint && !cwd.startsWith('.')) {
      entryPoint = tryResolve(__dirname);
      tried.push(__dirname);
    }
    if (!entryPoint) {
      throw new Errors.UnresolvablePluginError(pluginSpecifier, tried);
    }

    debug('Found entry point %s for plugin %s', entryPoint, pluginSpecifier);

    const {packageJson} = await this.#fileManager.findPkgUp(
      dirname(entryPoint),
      {
        normalize: true,
        strict: true,
      },
    );

    if (isBlessedPlugin(pluginSpecifier)) {
      const blessedMetadata = await this.getBlessedMetadata();
      return blessedMetadata[pluginSpecifier];
    }

    return PluginMetadata.create({
      id: packageJson.name,
      requestedAs: pluginSpecifier,
      entryPoint,
      pkgJson: packageJson,
    });
  }

  /**
   * @todo This is rather verbose for what it does. Maybe get rid of it
   */
  private validateRequestedPluginIds(pluginIds: string[] = []): string[] {
    const RequestedPluginsSchema = NonEmptyNonEmptyStringArraySchema.transform(
      (plugins) => [...new Set([...plugins])],
    );

    // TODO throw SmokeError instead
    const result = RequestedPluginsSchema.safeParse(pluginIds);
    if ('error' in result) {
      throw fromZodError(result.error);
    }
    return result.data;
  }
}

const debug = Debug('midnight-smoker:plugin:registry');
