/**
 * Provides {@link Smoker}, which is the main class of `midnight-smoker`.
 *
 * Typically the user-facing point of entry when used programmatically.
 *
 * @packageDocumentation
 */
import {
  type ComponentKind,
  type ComponentKinds,
  DEFAULT_EXECUTOR_ID,
  ERROR,
  FAILED,
  OK,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {InvalidArgError} from '#error/invalid-arg-error';
import {UnknownError} from '#error/unknown-error';
import {type SmokeResults} from '#event/core-events';
import {type Executor} from '#executor';
import {guessPkgManagerLogic} from '#machine/actor/guess-pkg-manager';
import {queryWorkspacesLogic} from '#machine/actor/query-workspaces';
import {SmokeMachine, type SmokeMachineOutput} from '#machine/smoke-machine';
import {OptionsParser} from '#options/options-parser';
import {BLESSED_PLUGINS} from '#plugin/blessed';
import {type Component, type ComponentObject} from '#plugin/component';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {PluginRegistry} from '#plugin/registry';
import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {type PkgManager} from '#schema/pkg-manager';
import {type Reporter} from '#schema/reporter';
import {type SomeRule} from '#schema/rule';
import {
  type RawSmokerOptions,
  type SmokerOptions,
} from '#schema/smoker-options';
import {createDebug} from '#util/debug';
import {FileManager} from '#util/filemanager';
import {isBlessedPlugin} from '#util/guard/blessed-plugin';
import {castArray} from '#util/util';
import {EventEmitter} from 'events';
import {noop} from 'lodash';
import {
  type AnyActorRef,
  createActor,
  type InspectionEvent,
  toPromise,
  type UnknownActorLogic,
  type UnknownActorRef,
} from 'xstate';

/**
 * Currently, capabilities are for testing purposes because it's a huge pain to
 * make them do much more than that.
 *
 * This allows a prebuilt {@link PluginRegistry} to be provided when creating a
 * {@link Smoker} instance.
 */
export interface SmokerCapabilities {
  fileManager?: FileManager;
  inspect?: (evt: InspectionEvent) => void;
  logic?: UnknownActorLogic;

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
  public readonly fileManager: FileManager;

  public readonly inspect: (evt: InspectionEvent) => void;

  public readonly logic: UnknownActorLogic;

  /**
   * Mapping of plugin identifiers (names) to plugin "instances", which can
   * contain a collection of rules and other stuff (in the future)
   */
  public readonly pluginRegistry: PluginRegistry;

  /**
   * Parsed & fully validated options
   */
  public readonly smokerOptions: SmokerOptions;

  private constructor(
    smokerOptions: SmokerOptions,
    {
      fileManager = FileManager.create(),
      inspect = noop,
      logic = SmokeMachine,
      pluginRegistry = PluginRegistry.create(),
    }: SmokerCapabilities = {},
  ) {
    super();
    const {all, workspace} = smokerOptions;
    this.smokerOptions = Object.freeze(smokerOptions);
    this.fileManager = fileManager;
    this.logic = logic;
    this.inspect = inspect;

    /**
     * Normally, the CLI will intercept this before we get here
     */
    if (all && workspace.length) {
      throw new InvalidArgError(
        'Option "workspace" is mutually exclusive with "all"',
      );
    }

    this.pluginRegistry = pluginRegistry;

    debug(`Smoker instantiated with registry: ${this.pluginRegistry}`);
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

  public static async getDefaultPkgManager(
    this: void,
    rawSmokerOptions?: RawSmokerOptions,
  ): Promise<string> {
    const smoker = await Smoker.create(rawSmokerOptions);

    const wsActor = createActor(queryWorkspacesLogic, {
      input: {all: true, cwd: process.cwd()},
    });
    const wsP = toPromise(wsActor);
    wsActor.start();
    const workspaceInfo = await wsP;

    const guessActor = createActor(guessPkgManagerLogic, {
      input: {
        fileManager: FileManager.create(),
        plugins: smoker.getAllPlugins(),
        workspaceInfo,
      },
    });
    const guessP = toPromise(guessActor);
    guessActor.start();
    const desiredPkgManager = await guessP;
    return desiredPkgManager;
  }

  /**
   * Initializes a {@link Smoker} instance and returns a list of package
   * managers.
   *
   * @param rawSmokerOptions Raw smoker options
   * @returns List of package managers
   */
  public static async getPkgManagers(
    this: void,
    rawSmokerOptions?: RawSmokerOptions,
  ): Promise<(Component<typeof ComponentKinds.PkgManager> & PkgManager)[]> {
    const smoker = await Smoker.create(rawSmokerOptions);
    return smoker.getAllPkgManagers();
  }

  /**
   * Initializes a {@link Smoker} instance and returns a list of reporteres.
   *
   * @param rawSmokerOptions Raw Smoker options
   * @returns List of plugins
   */
  public static async getPlugins(
    this: void,
    rawSmokerOptions?: RawSmokerOptions,
  ): Promise<StaticPluginMetadata[]> {
    const smoker = await Smoker.create(rawSmokerOptions);
    return smoker.getAllPlugins();
  }

  /**
   * Initializes a {@link Smoker} instance and returns a list of reporters.
   *
   * @param rawSmokerOptions - Raw Smoker options
   * @returns List of reporters
   */
  public static async getReporters(
    this: void,
    rawSmokerOptions?: RawSmokerOptions,
  ): Promise<(Component<typeof ComponentKinds.Reporter> & Reporter)[]> {
    const smoker = await Smoker.create(rawSmokerOptions);
    return smoker.getAllReporters();
  }

  /**
   * Initializes a {@link Smoker} instance and returns a list of rules.
   *
   * @param rawSmokerOptions - Raw Smoker options (including `plugin`)
   * @returns List of rules
   */
  public static async getRules(
    this: void,
    rawSmokerOptions?: RawSmokerOptions,
  ): Promise<(Component<typeof ComponentKinds.Rule> & SomeRule)[]> {
    const smoker = await Smoker.create(rawSmokerOptions);
    return smoker.getAllRules();
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
   * Boots up the smoker with the provided options and plugin registry.
   *
   * Several things have to happen, in order, before we can start smoking:
   *
   * 1. Assuming we have no prebuilt registry, built-in plugins must
   *    {@link PluginRegistry.registerPlugins be registered}
   * 2. Assuming we have no prebuilt registry, external plugins then must be
   *    loaded.
   * 3. The registry must refuse further registrations.
   * 4. Use `OptionsParser.parse()` to parse the options
   *
   * @param rawSmokerOptions - The options for the smoker.
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
      debug('Requested external plugins: %O', extPlugins);
    }

    let {fileManager, pluginRegistry} = caps;
    fileManager ??= FileManager.create();

    if (!pluginRegistry) {
      debug(
        'bootstrap(): initializing new plugin registry & registering plugins',
      );
      pluginRegistry = PluginRegistry.create({fileManager});
      await pluginRegistry.registerPlugins(BLESSED_PLUGINS);
      await pluginRegistry.registerPlugins(extPlugins);
    }

    // disable new registrations
    pluginRegistry.close();

    if (pluginRegistry.plugins.length) {
      debug('🔌 Registered %d plugin(s)', pluginRegistry.plugins.length);
    } else {
      debug('⚠️ No plugins registered!');
    }

    const finalSmokerOptions =
      OptionsParser.create(pluginRegistry).parse(rawSmokerOptions);

    return {
      fileManager,
      pluginRegistry,
      smokerOptions: finalSmokerOptions,
    };
  }

  /**
   * @internal
   */
  private createActor(
    fileManager: FileManager,
    smokerOptions: Readonly<SmokerOptions>,
    pluginRegistry: PluginRegistry,
    defaultExecutor: Executor,
    systemExecutor: Executor,
    inspect: (evt: InspectionEvent) => void,
  ): UnknownActorRef {
    return createActor(this.logic, {
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
  }

  /**
   * @internal
   */
  private getAllPkgManagers(): (Component<typeof ComponentKinds.PkgManager> &
    PkgManager)[] {
    return this.pluginRegistry.plugins.flatMap((plugin) =>
      plugin.pkgManagers.map((pkgManager) => ({
        ...pkgManager,
        ...this.getComponent(pkgManager),
      })),
    );
  }

  /**
   * @internal
   */
  private getAllPlugins(): Readonly<PluginMetadata>[] {
    return this.pluginRegistry.plugins;
  }

  /**
   * @internal
   */
  private getAllReporters(): (Component<typeof ComponentKinds.Reporter> &
    Reporter)[] {
    return this.pluginRegistry.plugins.flatMap((plugin) =>
      plugin.reporters.map((reporter) => ({
        ...reporter,
        ...this.getComponent(reporter),
      })),
    );
  }

  /**
   * @internal
   */
  private getAllRules(): (Component<typeof ComponentKinds.Rule> & SomeRule)[] {
    return this.pluginRegistry.plugins.flatMap((plugin) =>
      plugin.rules.map((rule) => ({
        ...rule,
        ...this.getComponent(rule),
      })),
    );
  }

  /**
   * @internal
   */
  private getComponent<T extends ComponentKind>(
    componentObject: ComponentObject<T>,
  ): Component<T> {
    return this.pluginRegistry.getComponent(componentObject);
  }

  /**
   * @internal
   */
  private async runActor(actor: AnyActorRef): Promise<SmokeMachineOutput> {
    const p = toPromise(actor);
    actor.start();
    let output: SmokeMachineOutput;
    try {
      output = (await p) as SmokeMachineOutput;
    } catch (err) {
      debug(`Actor %s rejected:`, actor.id, err);
      throw err;
    } finally {
      actor.stop();
    }
    return output;
  }

  /**
   * Pack, install, run checks (optionally), and run scripts (optionally)
   *
   * @returns Results of linting and/or custom script execution
   */
  public async smoke(): Promise<SmokeResults> {
    const {fileManager, inspect, pluginRegistry, smokerOptions} = this;

    const [defaultExecutor, systemExecutor] = await Promise.all([
      pluginRegistry.getExecutor(DEFAULT_EXECUTOR_ID),
      pluginRegistry.getExecutor(SYSTEM_EXECUTOR_ID),
    ]);

    const actor = this.createActor(
      fileManager,
      smokerOptions,
      pluginRegistry,
      defaultExecutor,
      systemExecutor,
      inspect,
    );

    const output = await this.runActor(actor);

    const {plugins} = pluginRegistry;

    let results: SmokeResults;
    switch (output.type) {
      case OK:
        results = {
          ...output,
          plugins,
          smokerOptions,
        };
        debug('Completed successfully with results: %O', results);
        break;
      case FAILED:
        results = {
          ...output,
          plugins,
          smokerOptions,
        };
        debug('Completed with failure: %O', results);
        break;
      case ERROR:
        results = {
          ...output,
          plugins,
          smokerOptions,
        };
        debug('Completed with error(s): %O', results);
        break;
      default: {
        const exhaustiveCheck: never = output;
        throw new UnknownError(`Unhandled output case: ${exhaustiveCheck}`);
      }
    }
    return results;
  }
}

const debug = createDebug(__filename);
