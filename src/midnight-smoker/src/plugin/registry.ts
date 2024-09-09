import type * as Schema from '#schema/meta/for-plugin-registry';

import {type LoaderCapabilities} from '#capabilities';
import {
  type ComponentKind,
  ComponentKinds,
  DEFAULT_COMPONENT_ID,
  OK,
  RuleSeverities,
} from '#constants';
import * as Err from '#error/meta/for-plugin-registry';
import {PkgManagerLoaderMachine} from '#machine/pkg-manager-loader-machine';
import {RegistryMachine} from '#machine/registry-machine';
import {
  type BaseComponentEnvelope,
  type EnvelopeForKind,
  type PkgManagerEnvelope,
  type ReporterEnvelope,
  type RuleEnvelope,
} from '#plugin/component-envelope';
import {PluginMetadata} from '#plugin/plugin-metadata';
import * as assert from '#util/assert';
import {createDebug} from '#util/debug';
import {once} from '#util/decorator';
import {FileManager} from '#util/filemanager';
import {uniqueId, type UniqueId} from '#util/unique-id';
import {caseInsensitiveEquals} from '#util/util';
import {type Debugger} from 'debug';
import {cloneDeep, head, isEmpty, isFunction, isString} from 'lodash';
import util from 'node:util';
import stringify from 'stringify-object';
import {type SetOptional} from 'type-fest';
import {
  type ActorRefFrom,
  createActor,
  type Subscription,
  toPromise,
  waitFor,
} from 'xstate';

import {BLESSED_PLUGINS} from './blessed.js';
import {
  type Component,
  type ComponentObject,
  type ComponentRegistry,
  type ComponentRegistryEntries,
  type SomeComponentObject,
} from './component.js';

/**
 * Capabilities for a {@link PluginRegistry}
 */
export interface PluginRegistryCapabilities {
  blessedPluginIds?: readonly string[];
  fileManager?: FileManager;
  loader?: LoaderCapabilities;
  registryLogic?: typeof RegistryMachine;
}

/**
 * Static metadata about a {@link PluginRegistry}
 *
 * @see {@link PluginRegistry.toJSON}
 */
export interface StaticPluginRegistry {
  id: UniqueId<'PluginRegistry'>;
  plugins: Schema.StaticPluginMetadata[];
}

export class PluginRegistry implements Disposable {
  /**
   * The unique ID for a {@link #registrar}
   *
   * Reset when {@link clear} is called
   */
  #actorId: UniqueId<'RegistryMachine'>;

  /**
   * List of plugin IDs which are considered "blessed" and will not have their
   * component ID's namespaced to the plugin ID.
   */
  readonly #blessedPluginIds: Readonly<Set<string>> = new Set();

  /**
   * Mapping of component objects (`Reporter`s, `PkgManager`s, etc.) to their
   * respective `Component` metadata objects.
   *
   * Used to avoid duplicating components and retrieval of component ID for any
   * given registered component object
   *
   * Reset when {@link clear} is called
   */
  #componentRegistry: ComponentRegistry = new WeakMap();

  /**
   * Lookup of components by {@link ComponentKind kind}
   *
   * Reset when {@link clear} is called
   */
  #componentsByKind = {
    [ComponentKinds.Executor]: new Map<string, Schema.Executor>(),
    [ComponentKinds.PkgManager]: new Map<string, Schema.PkgManager>(),
    [ComponentKinds.Reporter]: new Map<string, Schema.Reporter>(),
    [ComponentKinds.Rule]: new Map<string, Schema.SomeRule>(),
  } as const;

  /**
   * File manager for reading and writing files; passed through to a
   * {@link #registrar}
   */
  readonly #fileManager: FileManager;

  /**
   * Optional loader capabilities passed through to a {@link #registrar}
   */
  readonly #loader?: LoaderCapabilities;

  /**
   * Map of plugin ID to metadata
   *
   * Reset when {@link clear} is called
   */
  readonly #pluginMap: Map<string, Readonly<PluginMetadata>> = new Map();

  /**
   * Actor for {@link #registryLogic}
   *
   * Reset when {@link clear} is called
   */
  #registrar: ActorRefFrom<typeof RegistryMachine>;

  /**
   * Actor logic which handles resolution and registration of plugins
   */
  readonly #registryLogic: typeof RegistryMachine;

  /**
   * A subscription to the `REGISTERED` event of the {@link #registrar}, which is
   * emitted once per registered plugin.
   *
   * Reset when {@link clear} is called
   */
  #subscription: Subscription;

  /**
   * Debugger with {@link id instance ID} in namespace
   */
  private debug: Debugger;

  /**
   * Unique instance ID
   */
  public readonly id: UniqueId<'PluginRegistry'>;

  public constructor(caps: PluginRegistryCapabilities = {}) {
    const {
      blessedPluginIds = BLESSED_PLUGINS,
      fileManager = FileManager.create(),
      loader,
      registryLogic = RegistryMachine,
    } = caps;
    this.id = uniqueId({prefix: 'PluginRegistry'});
    this.debug = createDebug(__filename, this.id);

    this.#registryLogic = registryLogic;
    this.#blessedPluginIds = Object.freeze(new Set(blessedPluginIds));
    this.#fileManager = fileManager;
    this.#loader = loader;

    this.#actorId = uniqueId({prefix: 'RegistryMachine'});
    this.#registrar = this.createRegistrar();
    this.#subscription = this.#subscribe();

    this.debugAnnounce(caps);
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

  #subscribe() {
    return this.#registrar.on('REGISTERED', ({metadata, newComponents}) => {
      assert.ok(!this.#pluginMap.has(metadata.id));
      this.updateComponentsByKind(newComponents);
      this.#pluginMap.set(metadata.id, metadata);
    });
  }

  /**
   * Returns a map of defs by component kind
   *
   * @param kind Component kind
   * @returns Map of component ID to component object
   */
  private componentsForKind<T extends ComponentKind>(
    kind: T,
  ): Map<string, ComponentObject<T>> {
    return this.#componentsByKind[kind] as Map<string, ComponentObject<T>>;
  }

  private createRegistrar(): ActorRefFrom<typeof RegistryMachine> {
    this.debug('Starting registrar with ID %s', this.#actorId);
    const registrar = createActor(this.#registryLogic, {
      id: this.#actorId,
      input: {
        cwd: process.cwd(),
        fileManager: this.#fileManager,
        isBlessedPlugin: (pluginId: string) =>
          this.#blessedPluginIds.has(pluginId),
        loader: this.#loader,
      },
      logger: createDebug('machine', this.#actorId),
    }).start();

    return registrar;
  }

  private debugAnnounce(caps: PluginRegistryCapabilities) {
    let debugMsg = `Created ${this} with `;
    if (isEmpty(caps)) {
      debugMsg += 'default behavior';
    } else {
      const capsMsg: string[] = [];
      if (caps.fileManager) {
        capsMsg.push('custom FileManager');
      }
      if (caps.loader) {
        capsMsg.push('custom module loader');
      }
      if (caps.registryLogic) {
        capsMsg.push('custom registry logic');
      }
      if (caps.blessedPluginIds) {
        capsMsg.push(
          `custom blessed plugin IDs (${caps.blessedPluginIds.join(', ')})`,
        );
      }
      debugMsg += capsMsg.join(' & ');
    }
    this.debug(debugMsg);
  }

  /**
   * Helps generate component envelopes for enabled components (but not
   * `PkgManager`s)
   *
   * Determining enabled package managers is way more complex than this! See
   * {@link loadPkgManagers}.
   *
   * @param kind Component kind
   * @param predicate A function which returns--at minimum--the bits of an
   *   envelope that are not in {@link BaseComponentEnvelope} or `undefined` if
   *   the component is disabled
   * @returns A list of enabled component envelopes for the given `kind`
   */
  private enabledComponentEnvelopes<
    T extends Exclude<ComponentKind, 'PkgManager'>,
  >(
    kind: T,
    predicate: (
      component: ComponentObject<T>,
      id: string,
    ) =>
      | SetOptional<EnvelopeForKind<T>, keyof BaseComponentEnvelope>
      | undefined,
  ): EnvelopeForKind<T>[] {
    return [...this.componentsForKind(kind)].reduce<EnvelopeForKind<T>[]>(
      (acc, [id, component]) => {
        const partialEnabledComponentEnvelope = predicate(component, id);
        if (partialEnabledComponentEnvelope) {
          const envelope = {
            id,
            plugin: this.pluginForComponent(component),
            ...partialEnabledComponentEnvelope,
          } as EnvelopeForKind<T>;
          return [...acc, envelope];
        }
        return acc;
      },
      [],
    );
  }

  /**
   * It's not the opposite of {@link isClosed}!
   */
  private get isActive(): boolean {
    return this.#registrar.getSnapshot().status === 'active';
  }

  /**
   * Whether the {@link #registrar} is stopped or done
   */
  private get isStopped(): boolean {
    const {status} = this.#registrar.getSnapshot();
    return status === 'stopped' || status === 'done';
  }

  private updateComponentsByKind(
    componentRegistryEntries: ComponentRegistryEntries,
  ) {
    for (const [componentObject, component] of componentRegistryEntries) {
      // this check should have happened in the register-plugin actor
      // after the plugin was initialized
      assert.ok(
        !this.#componentRegistry.has(componentObject),
        `${component.kind} "${component.id}" already registered. This is a bug`,
      );
      this.#componentRegistry.set(componentObject, component);
      const map = this.#componentsByKind[component.kind] as Map<
        string,
        ComponentObject<typeof component.kind>
      >;
      map.set(component.id, componentObject);
    }
  }

  /**
   * Clears all plugins from the registry and resets ~~all~~ most internal
   * state.
   *
   * Does not reset decorated methods
   */
  public clear(): void {
    this.#pluginMap.clear();
    this.#componentRegistry = new WeakMap();
    this.#componentsByKind = {
      [ComponentKinds.Executor]: new Map<string, Schema.Executor>(),
      [ComponentKinds.PkgManager]: new Map<string, Schema.PkgManager>(),
      [ComponentKinds.Reporter]: new Map<string, Schema.Reporter>(),
      [ComponentKinds.Rule]: new Map<string, Schema.SomeRule>(),
    };
    this.#subscription?.unsubscribe();
    this.#registrar.stop();

    this.#actorId = uniqueId({prefix: 'RegistryMachine'});
    this.#registrar = this.createRegistrar();
    this.#subscription = this.#subscribe();
  }

  /**
   * Closes the registry, preventing further plugins from being registered.
   *
   * The registrar will continue to process in-progress plugin registrations,
   * but no new ones may be enqueued.
   *
   * @internal
   */
  public close() {
    if (this.isOpen) {
      try {
        this.#registrar.send({type: 'CLOSE'});
      } catch {}
    }
  }

  /**
   * Loads all the enabled package managers.
   *
   * This is complex and there should be no need to call this method more than
   * once per process.
   *
   * @param workspaceInfo Workspace information
   * @param smokerOptions All the options
   * @returns List of {@link PkgManagerEnvelope} objects, one per enabled package
   *   manager component
   */
  @once
  public async enabledPkgManagers(
    workspaceInfo: Schema.WorkspaceInfo[],
    smokerOptions: Schema.SmokerOptions,
  ): Promise<PkgManagerEnvelope[]> {
    const actor = createActor(PkgManagerLoaderMachine, {
      input: {
        componentRegistry: this.#componentRegistry,
        desiredPkgManagers: smokerOptions.pkgManager,
        fileManager: this.#fileManager,
        plugins: this.plugins,
        workspaceInfo,
      },
    });
    const p = toPromise(actor);
    actor.start();
    const result = await p;
    if (result.type === OK) {
      return result.envelopes;
    }
    throw result.error;
  }

  public enabledReporters(
    smokerOptions: Schema.SmokerOptions,
  ): ReporterEnvelope[] {
    /**
     * Lazy clone of the options to be passed to the `when` function of a
     * reporter, in case it is not explicitly enabled via options.
     */
    let clonedOptions: Schema.SmokerOptions | undefined;

    /**
     * Returns `true` if the reporter is explicitly enabled in the options
     *
     * @param reporterId
     * @returns
     */
    const isReporterExplicitlyEnabled = (reporterId: string): boolean =>
      smokerOptions.reporter.some((desiredReporterId) =>
        caseInsensitiveEquals(desiredReporterId, reporterId),
      );

    return this.enabledComponentEnvelopes(
      ComponentKinds.Reporter,
      (reporter, id) => {
        if (isReporterExplicitlyEnabled(id)) {
          return {reporter};
        }
        if (isFunction(reporter.when)) {
          clonedOptions ??= cloneDeep(smokerOptions);
          try {
            return reporter.when(clonedOptions) ? {reporter} : undefined;
          } catch (err) {
            throw new Err.ReporterError(err, reporter);
          }
        }
      },
    );
  }

  /**
   * Returns a list of {@link RuleEnvelope}s for all enabled rules.
   *
   * @param smokerOptions Options
   * @returns All enabled rules across all plugins
   * @internal
   */
  public enabledRules(smokerOptions: Schema.SmokerOptions): RuleEnvelope[] {
    const {rules: configs} = smokerOptions;
    return this.enabledComponentEnvelopes(ComponentKinds.Rule, (rule, id) => {
      const config = configs[id];
      if (config.severity !== RuleSeverities.Off) {
        return {config, rule};
      }
    });
  }

  /**
   * Gets a {@link Component} for a {@link ComponentObject}
   *
   * @param componentObject A component object (definition)
   * @returns Component
   * @internal
   */
  public getComponent<T extends ComponentKind>(
    componentObject: ComponentObject<T>,
  ): Component<T> {
    if (this.#componentRegistry.has(componentObject)) {
      return this.#componentRegistry.get(componentObject) as Component<T>;
    }
    throw new Err.UnknownComponentError('Component not found', componentObject);
  }

  /**
   * Looks up a component ID by its definition
   *
   * @param componentObject A component object (definition)
   * @returns Component ID
   * @internal
   */
  public getComponentId<T extends ComponentKind>(
    componentObject: ComponentObject<T>,
  ): string {
    return this.getComponent(componentObject).id;
  }

  /**
   * Gets an {@link Executor} by ID
   *
   * @param componentId Executor ID
   * @returns A registered `Executor`
   * @internal
   */
  public async getExecutor(
    componentId = DEFAULT_COMPONENT_ID,
  ): Promise<Schema.Executor> {
    const value =
      this.#componentsByKind[ComponentKinds.Executor].get(componentId);
    if (!value) {
      throw new Err.UnknownComponentError(
        `Executor with component ID ${componentId} not found`,
        componentId,
      );
    }
    return value;
  }

  public pluginForComponent(
    componentObject: SomeComponentObject,
  ): Readonly<PluginMetadata> {
    const plugin = this.#pluginMap.get(
      this.getComponent(componentObject).pluginName,
    );
    if (!plugin) {
      throw new Err.SmokerReferenceError(
        `No plugin found for component object ${stringify(componentObject)}`,
      );
    }
    return plugin;
  }

  /**
   * Registers a plugin from metadata; this is the usual flow.
   *
   * @param metadataOrName - Already-created {@link PluginMetadata} object
   * @param plugin - Already-loaded, normalized plugin object
   */
  public async registerPlugin(
    metadataOrName: Readonly<PluginMetadata> | string,
    plugin: Schema.Plugin,
  ): Promise<Readonly<PluginMetadata>> {
    if (this.isClosed) {
      throw new Err.DisallowedPluginError();
    }

    const registrar = this.#registrar;

    const metadata = isString(metadataOrName)
      ? PluginMetadata.createTransient(metadataOrName)
      : metadataOrName;

    const id = uniqueId();

    const race = Promise.race([
      waitFor(registrar, ({context}) => id in context.registrations),
      waitFor(registrar, ({context}) => 'error' in context),
    ]);

    registrar.send({
      id,
      metadata,
      plugin,
      type: 'REGISTER_PLUGIN',
    });

    const {
      context: {error, registrations},
    } = await race;
    if (error) {
      throw error;
    }
    return head(registrations[id]!)!;
  }

  /**
   * Registers all plugins
   *
   * @param cwd Current working directory
   * @returns This {@link PluginRegistry}
   */
  public async registerPlugins(
    pluginIds: readonly string[] | string[] = [],
  ): Promise<Readonly<PluginMetadata>[]> {
    if (this.isClosed) {
      throw new Err.DisallowedPluginError();
    }

    if (isEmpty(pluginIds)) {
      return [];
    }

    const registrar = this.#registrar;

    this.debug('Attempting registration of plugin(s): %O', pluginIds);
    const id = uniqueId();

    const race = Promise.race([
      waitFor(registrar, ({context}) => id in context.registrations),
      waitFor(registrar, ({context}) => 'error' in context),
    ]);

    registrar.send({
      id,
      pluginIds,
      type: 'REGISTER_PLUGINS',
    });

    const {
      context: {error, registrations},
    } = await race;
    if (error) {
      throw error;
    }

    return registrations[id]!;
  }

  public [Symbol.dispose](): void {
    this.#subscription?.unsubscribe();
    this.#registrar.stop();
    this.debug('🗑️ %s stopped', this.#actorId);
  }

  public toJSON(): StaticPluginRegistry {
    return {
      id: this.id,
      plugins: this.plugins,
    };
  }

  public toString() {
    return util.format('[%s]', this.id);
  }

  public get componentRegistry(): ComponentRegistry {
    return this.#componentRegistry;
  }

  /**
   * Whether the registry can be considered "closed" and will not accept new
   * plugin registrations
   */
  public get isClosed(): boolean {
    return this.isStopped || this.#registrar.getSnapshot().matches('closed');
  }

  /**
   * Whether the registry will accept new plugin registrations
   */
  public get isOpen(): boolean {
    return this.isActive && this.#registrar.getSnapshot().matches('open');
  }

  /**
   * A list of metadata for _all_ registered plugins
   */
  public get plugins(): Readonly<PluginMetadata>[] {
    return [...this.#pluginMap.values()];
  }
}
