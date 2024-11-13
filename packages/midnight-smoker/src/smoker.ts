/**
 * Provides {@link Smoker}, which is the main class of `midnight-smoker`.
 *
 * Typically the user-facing point of entry when used programmatically.
 *
 * @packageDocumentation
 */
import type * as xs from 'xstate';

import {
  type ComponentKind,
  type ComponentKinds,
  DEFAULT_EXECUTOR_ID,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {type SmokeResults} from '#event/core-events';
import {SmokeMachine} from '#machine/smoke-machine';
import {runActor} from '#machine/util';
import {OptionsParser} from '#options/options-parser';
import {BLESSED_PLUGINS} from '#plugin/blessed';
import {
  type Component,
  type ComponentMetadata,
  type ComponentObject,
} from '#plugin/component';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {PluginRegistry} from '#plugin/registry';
import {
  type RawSmokerOptions,
  type SmokerOptions,
} from '#schema/smoker-options';
import {castArray} from '#util/common';
import {createDebug} from '#util/debug';
import {FileManager} from '#util/filemanager';
import {isBlessedPlugin} from '#util/guard/blessed-plugin';
import {EventEmitter} from 'events';
import {doNothing as noop} from 'remeda';

/**
 * XState inspector function; applied when creating a
 * {@link SmokerCapabilities.logic} actor.
 */
export type InspectorFn = (evt: xs.InspectionEvent) => void;

/**
 * Capabilities can be used to stub or otherwise modify the behavior of a
 * {@link Smoker} instance.
 */
export interface SmokerCapabilities {
  /**
   * FileManager instance; all FS operations go through this (but not module
   * loading)
   */
  fileManager?: FileManager;

  /**
   * An inspector for {@link logic}
   *
   * @param evt Inspection event
   */
  inspect?: InspectorFn;

  /**
   * The main actor logic
   */
  logic?: typeof SmokeMachine;

  /**
   * A {@link PluginRegistry} instance to use
   */
  pluginRegistry?: PluginRegistry;
}

/**
 * The main class.
 */
export class Smoker extends EventEmitter {
  /**
   * FileManager instance; all FS operations go through this (including dynamic
   * imports)
   */
  private readonly fileManager: FileManager;

  /**
   * XState inspector function; applied when creating a
   * {@link SmokerCapabilities.logic} actor.
   */
  private readonly inspect: InspectorFn;

  /**
   * The main actor logic
   */
  private readonly logic: typeof SmokeMachine;

  /**
   * Mapping of plugin identifiers (names) to plugin "instances", which can
   * contain a collection of rules and other stuff (in the future)
   */
  private readonly pluginRegistry: PluginRegistry;

  /**
   * Parsed & fully validated options
   */
  public readonly smokerOptions: SmokerOptions;

  private constructor(
    smokerOptions: SmokerOptions,
    {
      fileManager = FileManager.create(),
      inspect = noop(),
      logic = SmokeMachine,
      pluginRegistry = PluginRegistry.create(),
    }: SmokerCapabilities = {},
  ) {
    super();
    this.smokerOptions = Object.freeze(smokerOptions);
    this.fileManager = fileManager;
    this.logic = logic;
    this.inspect = inspect;
    this.pluginRegistry = pluginRegistry;
  }

  /**
   * Initializes a {@link Smoker} instance.
   */
  public static async create(this: void, rawSmokerOptions?: RawSmokerOptions) {
    const {pluginRegistry, smokerOptions} =
      await Smoker.bootstrap(rawSmokerOptions);
    return new Smoker(smokerOptions, {pluginRegistry});
  }

  /**
   * Initializes a {@link Smoker} instance with the provided capabilities.
   *
   * This is intended to be used mainly for testing or interally. Generally, ou
   * will want to use {@link Smoker.create} instead.
   *
   * @param rawSmokerOptions - Raw Smoker options
   * @param caps - Capabilities
   * @returns A new Smoker instance
   */
  public static async createWithCapabilities(
    this: void,
    rawSmokerOptions?: RawSmokerOptions,
    caps: SmokerCapabilities = {},
  ) {
    const {pluginRegistry, smokerOptions} = await Smoker.bootstrap(
      rawSmokerOptions,
      caps,
    );
    return new Smoker(smokerOptions, {...caps, pluginRegistry});
  }

  /**
   * Instantiate `Smoker` and immediately run.
   *
   * @param rawSmokerOptions - Options
   * @returns Results of linting and/or custom script execution
   */
  public static async smoke(
    this: void,
    rawSmokerOptions: RawSmokerOptions = {},
  ): Promise<SmokeResults | undefined> {
    const smoker = await Smoker.create(rawSmokerOptions);
    return smoker.smoke();
  }

  /**
   * Bootstraps a bunch of crap that the
   * {@link Smoker.constructor Smoker constructor} needs.
   *
   * Several things have to happen, in order, before we can instantiate:
   *
   * 1. We need a {@link FileManager} instance, since the {@link PluginRegistry}
   *    needs it too.
   * 2. If no {@link PluginRegistry} capability is provided, we need to instantiate
   *    a `PluginRegistry` and register plugins ("blessed" plugins first)
   * 3. Prevent the registry from accepting further plugin registrations.
   * 4. Parse & validate {@link SmokerOptions}
   *
   * Once we've done that, we return an object containing the `PluginRegistry`
   * instance, the validated options, and the `FileManager` instance; these
   * properties are all parameters for the `Smoker` constructor.
   *
   * @param rawSmokerOptions - Unvalidated options
   * @param caps - Capabilities
   * @returns An object containing the plugin registry and parsed options.
   * @internal
   */
  private static async bootstrap(
    this: void,
    rawSmokerOptions: RawSmokerOptions = {},
    caps: SmokerCapabilities = {},
  ): Promise<{
    fileManager: FileManager;
    pluginRegistry: PluginRegistry;
    smokerOptions: SmokerOptions;
  }> {
    const extPlugins = castArray(rawSmokerOptions.plugin).filter(
      (requested) => !isBlessedPlugin(requested),
    );
    if (extPlugins.length) {
      debug('Requested external plugins: %s', extPlugins.join(', '));
    }

    let {fileManager, pluginRegistry} = caps;
    fileManager ??= FileManager.create();

    if (!pluginRegistry) {
      pluginRegistry = PluginRegistry.create({fileManager});
      await pluginRegistry.registerPlugins(BLESSED_PLUGINS);
      await pluginRegistry.registerPlugins(extPlugins);
      debug('Instantiated new PluginRegistry & registered plugins');
    } else if (!pluginRegistry.fileManagerIs(fileManager)) {
      debug(
        `⚠️ Provided plugin registry will not share a FileManager instance with the Smoker object; I hope you know what you're doing`,
      );
    }

    // disable new registrations
    pluginRegistry.close();

    if (pluginRegistry.plugins.length) {
      debug('🔌 Registered %d plugin(s)', pluginRegistry.plugins.length);
    } else {
      debug('⚠️ No plugins registered! That is going to be a problem.');
    }

    const smokerOptions =
      OptionsParser.create(pluginRegistry).parse(rawSmokerOptions);

    return {
      fileManager,
      pluginRegistry,
      smokerOptions,
    };
  }

  /**
   * Looks up the associated `ComponentMetadata` for a given component object.
   *
   * @param componentObject Some component object
   * @returns The associated `ComponentMetadata` for that component object
   */
  private getComponent<T extends ComponentKind>(
    componentObject: ComponentObject<T>,
  ): ComponentMetadata<T> {
    return this.pluginRegistry.getComponent(componentObject);
  }

  /**
   * Returns a list of package manager components.
   *
   * Note: these are proper {@link Component Components}, so they will contain a
   * unique `id` and other plugin-related metadata.
   *
   * @returns All package managers
   */
  public getAllPkgManagers(): Component<typeof ComponentKinds.PkgManager>[] {
    return this.pluginRegistry.plugins.flatMap((plugin) =>
      plugin.pkgManagers.map((pkgManager) => ({
        ...pkgManager,
        ...this.getComponent(pkgManager),
      })),
    );
  }

  /**
   * Returns a list of plugins.
   *
   * @returns All plugins
   */
  public getAllPlugins(): Readonly<PluginMetadata>[] {
    return this.pluginRegistry.plugins;
  }

  /**
   * Returns a list of reporter components.
   *
   * Note: these are proper {@link Component Components}, so they will contain a
   * unique `id` and other plugin-related metadata.
   *
   * Also note: the consumer is responsible for filtering out hidden reporters.
   *
   * @returns All reporters
   */
  public getAllReporters(): Component<typeof ComponentKinds.Reporter>[] {
    return this.pluginRegistry.plugins.flatMap((plugin) =>
      plugin.reporters.map((reporter) => ({
        ...reporter,
        ...this.getComponent(reporter),
      })),
    );
  }

  /**
   * Returns a list of rule components.
   *
   * Note: these are proper {@link Component Components}, so they will contain a
   * unique `id` and other plugin-related metadata.
   *
   * @returns All rules
   */
  public getAllRules(): Component<typeof ComponentKinds.Rule>[] {
    return this.pluginRegistry.plugins.flatMap((plugin) =>
      plugin.rules.map((rule) => ({
        ...rule,
        ...this.getComponent(rule),
      })),
    );
  }

  /**
   * Pack, install, run checks (optionally), and run scripts (optionally)
   *
   * @remarks
   * This is the only interesting method in this class.
   * @returns Results of linting and/or custom script execution
   */
  public async smoke(): Promise<SmokeResults> {
    const {fileManager, inspect, pluginRegistry, smokerOptions} = this;

    const [defaultExecutor, systemExecutor] = await Promise.all([
      pluginRegistry.getExecutor(DEFAULT_EXECUTOR_ID),
      pluginRegistry.getExecutor(SYSTEM_EXECUTOR_ID),
    ]);

    const output = await runActor(this.logic, {
      id: 'SmokeMachine',
      input: {
        auxEmitter: this,
        defaultExecutor,
        fileManager,
        pluginRegistry,
        shouldShutdown: true,
        smokerOptions,
        systemExecutor,
      },
      inspect,
      logger: createDebug(require.resolve('#machine/smoke-machine')),
    });

    const {plugins} = pluginRegistry;

    const results: SmokeResults = {
      ...output,
      plugins,
      smokerOptions,
    };
    debug('Smoke results: %O', results);
    return results;
  }
}

const debug = createDebug(__filename);
