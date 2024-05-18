import {ComponentRegistry, type ComponentObject} from '#component';
import {
  ComponentKinds,
  DEFAULT_COMPONENT_ID,
  type ComponentKind,
} from '#constants';
import {
  DisallowedPluginError,
  DuplicatePluginError,
  InvalidComponentError,
  PluginConflictError,
  PluginImportError,
  PluginInitError,
  PluginResolutionError,
  UnresolvablePluginError,
} from '#error';
import {createPluginAPI} from '#plugin/create-plugin-api';
import {PluginMetadata, initBlessedMetadata} from '#plugin/plugin-metadata';
import {
  createRuleOptionsSchema,
  getDefaultRuleOptions,
} from '#rule/create-rule-options';
import {
  RawRuleOptionsSchema,
  type Executor,
  type PkgManagerDef,
  type ReporterDef,
  type StaticPluginMetadata,
} from '#schema';
import {PluginSchema, type Plugin} from '#schema/plugin';
import {
  EmptyObjectSchema,
  FileManager,
  NonEmptyNonEmptyStringArraySchema,
  isErrnoException,
} from '#util';
import Debug from 'debug';
import {isEmpty, isError, isString} from 'lodash';
import {dirname} from 'node:path';
import util from 'node:util';
import {type PackageJson} from 'type-fest';
import {z} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {isBlessedPlugin, type BlessedPlugin} from './blessed';

const debug = Debug('midnight-smoker:plugin-registry');

/**
 * Static metadata about a {@link PluginRegistry}
 *
 * @see {@link PluginRegistry.toJSON}
 */
export interface StaticPluginRegistry {
  plugins: StaticPluginMetadata[];
}

export interface PluginRegistryCapabilities {
  fileManager?: FileManager;
}

export class PluginRegistry {
  private pluginMap: Map<string, Readonly<PluginMetadata>>;

  private seenRawPlugins: Map<unknown, string>;

  private blessedMetadata?: Readonly<Record<BlessedPlugin, PluginMetadata>>;

  public readonly componentRegistry: ComponentRegistry;

  private _isClosed = false;

  private _fm: FileManager;

  public constructor({
    fileManager = FileManager.create(),
  }: PluginRegistryCapabilities = {}) {
    this.pluginMap = new Map();
    this.seenRawPlugins = new Map();
    this._fm = fileManager;
    this.componentRegistry = ComponentRegistry.create();
  }

  public getComponentId(def: object) {
    return this.componentRegistry.getId(def);
  }

  public getComponent(def: object) {
    return this.componentRegistry.getComponent(def);
  }

  public static create(opts?: PluginRegistryCapabilities) {
    return new PluginRegistry(opts);
  }

  public get isClosed() {
    return this._isClosed;
  }

  public async getBlessedMetadata() {
    if (this.blessedMetadata) {
      return this.blessedMetadata;
    }
    this.blessedMetadata = await initBlessedMetadata(this._fm);
    return this.blessedMetadata;
  }

  public buildRuleOptions() {
    const MergedRuleOptionSchema = this.mergeRuleSchemas();
    const defaults = this.mergeRuleDefaults();
    return MergedRuleOptionSchema.default(defaults);
  }

  /**
   * Clears all plugins from the registry and resets all internal state.
   */
  public clear(): void {
    this.pluginMap.clear();
    this.seenRawPlugins.clear();
    this.componentRegistry.clear();
    this._isClosed = false;
  }

  public getExecutor(componentId = DEFAULT_COMPONENT_ID): Executor {
    const value = this.componentRegistry.getComponentByKind(
      ComponentKinds.Executor,
      componentId,
    )?.def;
    if (!value) {
      throw new InvalidComponentError(
        `Executor with component ID ${componentId} not found`,
        ComponentKinds.Executor,
        componentId,
      );
    }
    return value;
  }

  public get pkgManagerDefs(): PkgManagerDef[] {
    return this.plugins.flatMap((plugin) => [
      ...plugin.pkgManagerDefMap.values(),
    ]);
  }

  public get reporters(): ReporterDef[] {
    return this.plugins.flatMap((plugin) => [
      ...plugin.reporterDefMap.values(),
    ]);
  }

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

  /**
   * Loads all plugins
   *
   * @param cwd Current working directory
   * @returns This {@link PluginRegistry}
   */

  public async loadPlugins(
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
    return [...this.pluginMap.values()].reduce(
      (defaults, metadata) =>
        [...metadata.ruleDefMap.values()].reduce((acc, anyRule) => {
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
    return [...this.pluginMap.values()]
      .reduce(
        (pluginRuleSchema, metadata) =>
          pluginRuleSchema.merge(
            [...metadata.ruleDefMap.values()].reduce((ruleSchema, ruleDef) => {
              const id = this.getComponentId(ruleDef);
              const schema = ruleDef.schema
                ? createRuleOptionsSchema(
                    ruleDef.schema,
                    ruleDef.defaultSeverity,
                  )
                : createRuleOptionsSchema(
                    EmptyObjectSchema,
                    ruleDef.defaultSeverity,
                  );
              return ruleSchema.setKey(id, schema);
            }, z.object({}).catchall(RawRuleOptionsSchema)),
          ),
        z.object({}).catchall(RawRuleOptionsSchema),
      )
      .describe('Rule configuration for automated checks');
  }

  /**
   * Maybe creates a new {@link PluginMetadata} object, depending on the
   * `plugin`.
   *
   * At time of {@link resolvePlugin resolution}, the metadata's `id` is derived
   * from the `name` field of its ancestor `package.json`, and the `description`
   * is derived from that as well. However, a {@link Plugin} can provide a `name`
   * and `description` field, which should override the metadata's `id` and
   * `description` fields. {@link PluginMetadata} objects are readonly, so we
   * have to create a new one. This is allowed, because the metadata is not yet
   * stored in {@link PluginRegistry.pluginMap}.
   *
   * Note that {@link Plugin.name} maps to {@link PluginMetadata.id}.
   *
   * @param metadata - Plugin metadata
   * @param plugin - A plugin object
   * @returns Either the original metadata or new metadata with updated `id` and
   *   `description` fields.
   */
  private maybeUpdatePluginMetadata(
    metadata: Readonly<PluginMetadata>,
    plugin?: Plugin,
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
   * Closes the registry, preventing further plugins from being registered.
   */
  public close() {
    this._isClosed = true;
  }

  /**
   * If this returns `false`, then the plugin has already been loaded (somehow).
   *
   * Since plugins get normalized, executed, and then discarded, we have to keep
   * track somehow.
   *
   * @param rawPlugin - Raw plugin to check
   * @returns `false` if the plugin has been loaded, `true` if it has not.
   */
  private isPluginRegistered(rawPlugin: unknown) {
    return !this.seenRawPlugins.has(rawPlugin);
  }

  /**
   * Returns `true` if `metadata.id` is already a key in {@link pluginMap}
   *
   * @param metadata Plugin metadata
   * @returns `true` if `metadata.id` is already a key in {@link pluginMap};
   *   `false` otherwise
   */
  private isMetadataRegistered(metadata: Readonly<PluginMetadata>) {
    return this.pluginMap.has(metadata.id);
  }

  public registerComponent<T extends ComponentKind>(
    plugin: Readonly<PluginMetadata>,
    kind: T,
    def: ComponentObject<T>,
    name?: string,
  ) {
    this.componentRegistry.registerComponent(
      kind,
      plugin,
      name ?? DEFAULT_COMPONENT_ID,
      def,
    );
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
    plugin?: Plugin,
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
    plugin: Plugin,
  ): Promise<Readonly<PluginMetadata>>;

  public async registerPlugin(
    metadataOrName: Readonly<PluginMetadata> | string,
    nameOrPlugin?: string | Plugin,
  ): Promise<Readonly<PluginMetadata>> {
    if (this.isClosed) {
      throw new DisallowedPluginError();
    }

    let plugin: Plugin | undefined;
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

    if (this.isMetadataRegistered(metadata)) {
      const existingMetadata = this.pluginMap.get(metadata.id)!;
      throw new PluginConflictError(existingMetadata, metadata);
    }

    if (plugin === undefined) {
      let rawPlugin: unknown;
      try {
        rawPlugin = await this._fm.import(metadata.entryPoint);
      } catch (err) {
        throw isError(err) ? new PluginImportError(err, metadata) : err;
      }
      if (!this.isPluginRegistered(rawPlugin)) {
        throw new DuplicatePluginError(
          this.seenRawPlugins.get(rawPlugin)!,
          metadata.id,
        );
      }
      plugin = PluginRegistry.normalizePlugin(rawPlugin);
      this.seenRawPlugins.set(rawPlugin, metadata.id);
    } else if (!this.isPluginRegistered(plugin)) {
      throw new DuplicatePluginError(
        this.seenRawPlugins.get(plugin)!,
        metadata.id,
      );
    } else {
      this.seenRawPlugins.set(plugin, metadata.id);
    }

    metadata = this.maybeUpdatePluginMetadata(metadata, plugin);

    const registerComponent = this.registerComponent.bind(this, metadata);

    const getPlugins = () => this.plugins;

    const pluginApi = createPluginAPI(registerComponent, getPlugins, metadata);

    try {
      await plugin.plugin(pluginApi);
    } catch (err) {
      debug(err);
      throw isError(err) ? new PluginInitError(err, metadata, plugin) : err;
    }

    this.pluginMap.set(metadata.id, metadata);

    debug('Loaded plugin successfully: %s', metadata);

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
        return this._fm.resolve(pluginSpecifier, cwd);
      } catch (err) {
        if (isErrnoException(err)) {
          if (err.code !== 'MODULE_NOT_FOUND') {
            throw new PluginResolutionError(err, pluginSpecifier, from);
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
      throw new UnresolvablePluginError(pluginSpecifier, tried);
    }

    debug('Found entry point %s for plugin %s', entryPoint, pluginSpecifier);

    const {packageJson} = await this._fm.findPkgUp(dirname(entryPoint), {
      normalize: true,
      strict: true,
    });

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

  public get plugins(): Readonly<PluginMetadata>[] {
    return [...this.pluginMap.values()];
  }

  /**
   * Given the export(s) of a plugin's entry point, validate it and return a
   * {@link Plugin}.
   */
  public static normalizePlugin(rawPlugin: unknown): Plugin {
    return PluginSchema.parse(rawPlugin);
  }

  toString() {
    return util.format('%O', this.toJSON());
  }

  toJSON(): StaticPluginRegistry {
    return {
      plugins: this.plugins,
    };
  }
}
