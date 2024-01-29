import Reg from 'debug';
import {isEmpty, isError, isString} from 'lodash';
import {dirname} from 'node:path';
import util from 'node:util';
import {type PackageJson} from 'type-fest';
import {z} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {ComponentKinds, type Component} from '../component/component';
import {InvalidComponentError} from '../component/component/component-error';
import * as Executor from '../component/executor';
import * as PkgMgr from '../component/pkg-manager';
import * as Reporter from '../component/reporter';
import * as Rule from '../component/rule';
import * as RuleRunner from '../component/rule-runner';
import * as ScriptRunner from '../component/script-runner';
import {
  DEFAULT_COMPONENT_ID,
  DEFAULT_EXECUTOR_ID,
  SYSTEM_EXECUTOR_ID,
} from '../constants';
import * as Errors from '../error';
import {
  DisallowedPluginError,
  DuplicatePluginError,
  PluginConflictError,
  PluginImportError,
  PluginInitializationError,
  PluginResolutionError,
  UnresolvablePluginError,
} from '../error/internal-error';
import * as Event from '../event';
import {justImport, resolveFrom} from '../util/loader-util';
import {readPackageJson} from '../util/pkg-util';
import * as SchemaUtils from '../util/schema-util';
import {isErrnoException} from '../util/util';
import {isBlessedPlugin, type BlessedPlugin} from './blessed';
import * as Helpers from './helpers';
import {PluginMetadata, initBlessedMetadata} from './metadata';
import {zPlugin, type Plugin} from './plugin';
import type * as API from './plugin-api';
import {type StaticPluginMetadata} from './static-metadata';

const debug = Reg('midnight-smoker:plugin-registry');

export type RuleFilter = (rule: Component<Rule.SomeRule>) => boolean;

/**
 * Static metadata about a {@link PluginRegistry}
 *
 * @see {@link PluginRegistry.toJSON}
 */
export interface StaticPluginRegistry {
  plugins: StaticPluginMetadata[];
  scriptRunners: string[];
  ruleRunners: string[];
  executors: string[];
  pkgManagerDefs: string[];
}

export class PluginRegistry {
  private pluginMap: Map<string, PluginMetadata>;
  private seenRawPlugins: Map<unknown, string>;

  private apiMap: WeakMap<PluginMetadata, API.PluginAPI>;

  private ruleMap: Map<string, Component<Rule.SomeRule>[]>;

  private scriptRunnerMap: Map<string, Component<ScriptRunner.ScriptRunner>>;

  private ruleRunnerMap: Map<string, Component<RuleRunner.RuleRunner>>;

  private executorMap: Map<string, Component<Executor.Executor>>;

  private reporterMap: Map<string, Component<Reporter.ReporterDef>>;

  private pkgManagerDefMap: Map<string, Component<PkgMgr.PkgManagerDef>>;

  private blessedMetadata?: Readonly<Record<BlessedPlugin, PluginMetadata>>;

  #isClosed = false;

  private constructor() {
    this.pluginMap = new Map();
    this.apiMap = new WeakMap();
    this.ruleMap = new Map();
    this.scriptRunnerMap = new Map();
    this.ruleRunnerMap = new Map();
    this.executorMap = new Map();
    this.pkgManagerDefMap = new Map();
    this.reporterMap = new Map();
    this.seenRawPlugins = new Map();
  }

  public static create() {
    return new PluginRegistry();
  }

  public get isClosed() {
    return this.#isClosed;
  }

  public async getBlessedMetadata() {
    if (this.blessedMetadata) {
      return this.blessedMetadata;
    }
    this.blessedMetadata = await initBlessedMetadata();
    return this.blessedMetadata;
  }

  public buildRuleOptions() {
    const zMergedSchemas = this.mergeRuleSchemas();
    return zMergedSchemas.default(this.mergeRuleDefaults());
  }

  /**
   * Clears all plugins from the registry and resets all internal state.
   */
  public clear(): void {
    this.apiMap = new WeakMap();
    this.ruleMap.clear();
    this.ruleRunnerMap.clear();
    this.scriptRunnerMap.clear();
    this.executorMap.clear();
    this.pkgManagerDefMap.clear();
    this.pluginMap.clear();
    this.reporterMap.clear();
    this.seenRawPlugins.clear();
    this.#isClosed = false;
  }

  // TODO: get rid of this filter
  public getRules(filter?: RuleFilter) {
    const rules = [...this.ruleMap.values()].flat();
    return filter ? rules.filter(filter) : rules;
  }

  public getScriptRunner(componentId = DEFAULT_COMPONENT_ID) {
    const value = this.scriptRunnerMap.get(componentId);
    if (!value) {
      throw new InvalidComponentError(
        `ScriptRunner with component ID ${componentId} not found`,
        ComponentKinds.ScriptRunner,
        componentId,
      );
    }
    return value;
  }

  public getExecutor(componentId = DEFAULT_COMPONENT_ID) {
    const value = this.executorMap.get(componentId);
    if (!value) {
      throw new InvalidComponentError(
        `Executor with component ID ${componentId} not found`,
        ComponentKinds.Executor,
        componentId,
      );
    }
    return value;
  }

  public getRuleRunner(componentId = DEFAULT_COMPONENT_ID) {
    const value = this.ruleRunnerMap.get(componentId);
    if (!value) {
      throw new InvalidComponentError(
        `RuleRunner with component ID ${componentId} not found`,
        ComponentKinds.RuleRunner,
        componentId,
      );
    }
    return value;
  }

  public async loadPackageManagers({
    systemExecutorId = SYSTEM_EXECUTOR_ID,
    defaultExecutorId = DEFAULT_EXECUTOR_ID,
    ...opts
  }: RegistryLoadPackageManagersOpts = {}): Promise<
    Map<Readonly<PkgMgr.PkgManagerSpec>, PkgMgr.PkgManager>
  > {
    const systemExecutor = this.getExecutor(systemExecutorId);
    const defaultExecutor = this.getExecutor(defaultExecutorId);

    return await PkgMgr.loadPackageManagers(
      this.pkgManagerDefs,
      defaultExecutor,
      systemExecutor,
      opts,
    );
  }

  public get pkgManagerDefs() {
    return [...this.pkgManagerDefMap.values()];
  }

  public get reporters() {
    return [...this.reporterMap.values()];
  }

  private validateRequestedPluginIds(pluginIds: string[] = []): string[] {
    const zRequestedPlugins = z
      .array(SchemaUtils.zNonEmptyString)
      .min(1)
      .transform((plugins) => [...new Set([...plugins])]);

    // TODO throw SmokeError instead
    const result = zRequestedPlugins.safeParse(pluginIds);
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
      pluginIds.map((plugin) =>
        this.resolvePlugin(plugin, cwd)
          .then((metadata) => this.registerPlugin(metadata))
          .catch((err) => {
            // TODO: throw SmokeError instead
            if (err instanceof z.ZodError) {
              throw fromZodError(err);
            }
            throw err;
          }),
      ),
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
  public mergeRuleDefaults(): Record<string, any> {
    return [...this.pluginMap.values()].reduce(
      (defaults, metadata) =>
        [...metadata.ruleMap.values()].reduce(
          (acc, anyRule) => ({
            ...acc,
            [anyRule.id]: anyRule.defaultOptions,
          }),
          defaults,
        ),
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
   */
  public mergeRuleSchemas() {
    return [...this.pluginMap.values()]
      .reduce(
        (zPluginRuleSchema, metadata) =>
          zPluginRuleSchema.merge(
            [...metadata.ruleMap.values()].reduce(
              (zRuleSchema, rule) =>
                zRuleSchema.setKey(rule.id, rule.zRuleSchema),
              z.object({}).catchall(Rule.zBaseRuleOptions),
            ),
          ),
        z.object({}).catchall(Rule.zBaseRuleOptions),
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
    this.#isClosed = true;
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
  private isMetadataRegistered(metadata: PluginMetadata) {
    return this.pluginMap.has(metadata.id);
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
  ): Promise<PluginMetadata>;

  /**
   * Registers a plugin from metadata; this is the usual flow.
   *
   * @param metadata - Already-created {@link PluginMetadata} object
   * @param plugin - Already-loaded, normalized plugin object
   */
  public async registerPlugin(
    metadata: PluginMetadata,
    plugin?: Plugin,
  ): Promise<PluginMetadata>;

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
  ): Promise<PluginMetadata>;

  public async registerPlugin(
    metadataOrName: PluginMetadata | string,
    nameOrPlugin?: string | Plugin,
  ): Promise<PluginMetadata> {
    if (this.isClosed) {
      throw new DisallowedPluginError();
    }

    let plugin: Plugin | undefined;
    let metadata: PluginMetadata;

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
        rawPlugin = await justImport(metadata.entryPoint, metadata.pkgJson);
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

    const pluginApi = this.createPluginAPI(metadata);

    try {
      await plugin.plugin(pluginApi);
      this.pluginMap.set(metadata.id, metadata);

      this.ruleMap.set(metadata.id, [...metadata.ruleMap.values()]);

      for (const component of metadata.scriptRunnerMap.values()) {
        this.scriptRunnerMap.set(`${component.id}`, component);
      }

      for (const component of metadata.ruleRunnerMap.values()) {
        this.ruleRunnerMap.set(`${component.id}`, component);
      }

      for (const component of metadata.executorMap.values()) {
        this.executorMap.set(`${component.id}`, component);
      }

      for (const component of metadata.pkgManagerDefMap.values()) {
        this.pkgManagerDefMap.set(`${component.id}`, component);
      }

      for (const component of metadata.reporterMap.values()) {
        this.reporterMap.set(`${component.id}`, component);
      }

      debug('Loaded plugin %s successfully', metadata);
      return metadata;
    } catch (err) {
      throw isError(err)
        ? new PluginInitializationError(err, metadata, plugin)
        : err;
    }
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
  ): Promise<PluginMetadata> {
    let entryPoint: string | undefined;

    const tryResolve = (from: string) => {
      try {
        return resolveFrom(pluginSpecifier, cwd);
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

    const {packageJson} = await readPackageJson({
      cwd: dirname(entryPoint),
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

  public get plugins(): StaticPluginMetadata[] {
    return [...this.pluginMap.values()].map((metadata) => metadata.toJSON());
  }

  /**
   * Given the export(s) of a plugin's entry point, validate it and return a
   * {@link Plugin}.
   */
  public static normalizePlugin(rawPlugin: unknown): Plugin {
    return zPlugin.parse(rawPlugin);
  }

  toString() {
    return util.format('%O', this.toJSON());
  }

  toJSON(): StaticPluginRegistry {
    return {
      plugins: this.plugins,
      scriptRunners: [...this.scriptRunnerMap.keys()],
      ruleRunners: [...this.ruleRunnerMap.keys()],
      executors: [...this.executorMap.keys()],
      pkgManagerDefs: [...this.pkgManagerDefMap.keys()],
    };
  }

  /**
   * Creates a {@link API.PluginAPI} object for use by a specific plugin.
   *
   * @param metadata - Plugin metadata
   * @returns A {@link API.PluginAPI} object for use by a specific plugin
   */
  createPluginAPI(metadata: PluginMetadata): Readonly<API.PluginAPI> {
    if (this.apiMap.has(metadata)) {
      return this.apiMap.get(metadata)!;
    }

    // TODO: validate ruleDef
    const defineRule: API.DefineRuleFn = <
      const Name extends string,
      Schema extends Rule.RuleOptionSchema | void = void,
    >(
      ruleDef: Rule.RuleDef<Name, Schema>,
    ) => {
      metadata.addRule(ruleDef);
      debug(
        'Rule with name %s defined by plugin %s',
        ruleDef.name,
        metadata.id,
      );
      return pluginApi;
    };

    const definePackageManager: API.DefinePackageManagerFn = (
      pkgManagerDef,
      name = DEFAULT_COMPONENT_ID,
    ) => {
      metadata.addPkgManagerDef(name, pkgManagerDef);
      return pluginApi;
    };

    const defineScriptRunner: API.DefineScriptRunnerFn = (
      scriptRunner,
      name = DEFAULT_COMPONENT_ID,
    ) => {
      metadata.addScriptRunner(
        name,
        ScriptRunner.zScriptRunner.parse(scriptRunner),
      );
      return pluginApi;
    };

    const defineRuleRunner: API.DefineRuleRunnerFn = (
      ruleRunner,
      name = DEFAULT_COMPONENT_ID,
    ) => {
      metadata.addRuleRunner(name, RuleRunner.zRuleRunner.parse(ruleRunner));
      return pluginApi;
    };

    const defineExecutor: API.DefineExecutorFn = (
      executor,
      name = DEFAULT_COMPONENT_ID,
    ) => {
      metadata.addExecutor(name, Executor.zExecutor.parse(executor));
      return pluginApi;
    };

    const defineReporter: API.DefineReporterFn = (reporterDef) => {
      metadata.addReporter(Reporter.zReporterDef.parse(reporterDef));
      return pluginApi;
    };

    const getPlugins = () => {
      return this.plugins;
    };

    const pluginApi: API.PluginAPI = {
      SchemaUtils,
      Helpers,
      Rule,
      PkgManager: PkgMgr,
      Errors,
      Executor,
      RuleRunner,
      ScriptRunner,
      Event,
      z,
      zod: z,

      metadata,

      get plugins() {
        return getPlugins();
      },

      defineRule,
      definePackageManager,
      defineScriptRunner,
      defineRuleRunner,
      defineExecutor,
      defineReporter,
    };
    this.apiMap.set(metadata, pluginApi);

    return pluginApi;
  }
}

export interface RegistryLoadPackageManagersOpts
  extends PkgMgr.LoadPackageManagersOpts {
  systemExecutorId?: string;
  defaultExecutorId?: string;
}
