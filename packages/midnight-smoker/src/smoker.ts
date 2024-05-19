/**
 * Provides {@link Smoker}, which is the main class of `midnight-smoker`.
 *
 * Typically the user-facing point of entry when used programmatically.
 *
 * @packageDocumentation
 */

import {type ComponentKind} from '#constants';
import {InvalidArgError} from '#error/invalid-arg-error';
import {ControlMachine, type CtrlMachineOutput} from '#machine/control';
import {isActorOutputOk} from '#machine/util';
import type {RawSmokerOptions, SmokerOptions} from '#options/options';
import {OptionParser} from '#options/parser';
import {type Component, type ComponentObject} from '#plugin/component';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {FileManager} from '#util/filemanager';
import {castArray} from '#util/schema-util';
import Debug from 'debug';
import {createActor, toPromise, type AnyStateMachine} from 'xstate';
import {SmokeFailedError} from './error';
import {type SmokeResults} from './event';
import {type PkgManagerDef} from './pkg-manager';
import {BLESSED_PLUGINS, PluginRegistry, isBlessedPlugin} from './plugin';
import {type ReporterDef} from './reporter';

/**
 * Currently, capabilities are for testing purposes because it's a huge pain to
 * make them do much more than that.
 *
 * This allows a prebuilt {@link PluginRegistry} to be provided when creating a
 * {@link Smoker} instance.
 */
export interface SmokerCapabilities {
  fileManager?: FileManager;
  pluginRegistry?: PluginRegistry;

  controlMachine?: AnyStateMachine;
}

/**
 * The main class.
 */
export class Smoker {
  /**
   * FileManager instance; all FS operations go through this (including dynamic
   * imports)
   */
  private readonly fileManager: FileManager;

  /**
   * Mapping of plugin identifiers (names) to plugin "instances", which can
   * contain a collection of rules and other stuff (in the future)
   */
  private readonly pluginRegistry: PluginRegistry;

  /**
   * Used for emitting {@link SmokerEvent.SmokeOk} or
   * {@link SmokerEvent.SmokeFailed}
   */
  public readonly opts: Readonly<SmokerOptions>;

  private readonly controlMachine: AnyStateMachine;

  private constructor(
    opts: SmokerOptions,
    {
      pluginRegistry = PluginRegistry.create(),
      fileManager = FileManager.create(),
      controlMachine = ControlMachine,
    }: SmokerCapabilities = {},
  ) {
    const {all, workspace} = opts;
    this.opts = Object.freeze(opts);
    this.fileManager = fileManager;
    this.controlMachine = controlMachine;

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
  public static async create(this: void, opts?: RawSmokerOptions) {
    const {pluginRegistry, options} = await Smoker.bootstrap(opts);
    return new Smoker(options, {pluginRegistry});
  }

  /**
   * Initializes a {@link Smoker} instance with the provided capabilities.
   *
   * This is intended to be used mainly for testing or interally. Generally, ou
   * will want to use {@link Smoker.create} instead.
   *
   * @param opts - Raw Smoker options
   * @param caps - Capabilities
   * @returns A new Smoker instance
   */
  public static async createWithCapabilities(
    this: void,
    opts?: RawSmokerOptions,
    caps: SmokerCapabilities = {},
  ) {
    const {pluginRegistry, options} = await Smoker.bootstrap(opts, caps);
    return new Smoker(options, {...caps, pluginRegistry});
  }

  public static async getPkgManagers(
    this: void,
    opts?: RawSmokerOptions,
  ): Promise<(PkgManagerDef & Component)[]> {
    const smoker = await Smoker.create(opts);
    return smoker.getAllPkgManagers();
  }

  public static async getPlugins(
    this: void,
    opts?: RawSmokerOptions,
  ): Promise<StaticPluginMetadata[]> {
    const smoker = await Smoker.create(opts);
    return smoker.getAllPlugins();
  }

  /**
   * Initializes a {@link Smoker} instance and returns a list of reporters.
   *
   * @param opts - Raw Smoker options (including `plugin`)
   * @returns List of reporters
   */
  public static async getReporters(
    this: void,
    opts?: RawSmokerOptions,
  ): Promise<(ReporterDef & Component)[]> {
    const smoker = await Smoker.create(opts);
    return smoker.getAllReporters();
  }

  /**
   * Initializes a {@link Smoker} instance and returns a list of rules.
   *
   * @param opts - Raw Smoker options (including `plugin`)
   * @returns List of rules
   */
  public static async getRules(
    this: void,
    opts?: RawSmokerOptions,
  ): Promise<(SomeRuleDef & Component)[]> {
    const smoker = await Smoker.create(opts);
    return smoker.getAllRules();
  }

  /**
   * Instantiate `Smoker` and immediately run.
   *
   * @param opts - Options
   */
  public static async smoke(
    this: void,
    opts: RawSmokerOptions = {},
  ): Promise<SmokeResults | undefined> {
    const smoker = await Smoker.create(opts);
    return smoker.smoke();
  }

  /**
   * Pack, install, run checks (optionally), and run scripts (optionally)
   *
   * @returns Results
   */
  public async smoke(): Promise<SmokeResults> {
    const {
      controlMachine,
      pluginRegistry,
      fileManager,
      opts: smokerOptions,
    } = this;
    // TODO: trace logging; use xstate's inspector
    const controller = createActor(controlMachine, {
      id: 'smoke',
      input: {
        fileManager,
        smokerOptions,
        pluginRegistry,
        shouldShutdown: true,
      },
      logger: Debug('midnight-smoker:ControlMachine'),
    }).start();

    const output = (await toPromise(controller)) as CtrlMachineOutput;

    if (isActorOutputOk(output)) {
      const results: SmokeResults = {
        scripts: output.runScriptResults,
        lint: output.lintResults,
        plugins: pluginRegistry.plugins,
        opts: smokerOptions,
      };
      debug('completed with results: %o', results);
      return results;
    } else {
      throw new SmokeFailedError('Failure!', output.error, {results: output});
    }
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
   * 4. {@link OptionParser.parse Parse} the options.
   *
   * @param opts - The options for the smoker.
   * @param caps - Capabilities
   * @returns An object containing the plugin registry and parsed options.
   * @internal
   */
  private static async bootstrap(
    this: void,
    opts: RawSmokerOptions = {},
    caps: SmokerCapabilities = {},
  ): Promise<{
    pluginRegistry: PluginRegistry;
    fileManager: FileManager;
    options: SmokerOptions;
  }> {
    const plugins = castArray(opts.plugin).filter(
      (requested) => !isBlessedPlugin(requested),
    );
    debug('Requested external plugins: %O', plugins);

    let {pluginRegistry, fileManager} = caps;
    fileManager ??= FileManager.create();

    if (!pluginRegistry) {
      pluginRegistry = PluginRegistry.create({fileManager});
      // this must be done in sequence to protect the blessed plugins
      await pluginRegistry.registerPlugins(BLESSED_PLUGINS);
      await pluginRegistry.registerPlugins(plugins);
    }

    // disable new registrations
    pluginRegistry.close();

    debug('Registered %d plugin(s)', pluginRegistry.plugins.length);

    return {
      fileManager,
      pluginRegistry,
      options: OptionParser.create(pluginRegistry).parse(opts),
    };
  }

  private getAllPkgManagers(): (PkgManagerDef & Component)[] {
    return this.pluginRegistry.plugins.flatMap((plugin) => {
      return plugin.pkgManagerDefs.map((def) => ({
        ...def,
        ...this.getComponent(def),
      }));
    });
  }

  private getAllPlugins(): StaticPluginMetadata[] {
    return this.pluginRegistry.plugins;
  }

  private getAllReporters(): (ReporterDef & Component)[] {
    return this.pluginRegistry.plugins.flatMap((plugin) => {
      return plugin.reporterDefs.map((def) => ({
        ...def,
        ...this.getComponent(def),
      }));
    });
  }

  private getAllRules(): (SomeRuleDef & Component)[] {
    return this.pluginRegistry.plugins.flatMap((plugin) => {
      return plugin.ruleDefs.map(
        (def) =>
          ({
            ...def,
            ...this.getComponent(def),
          }) as SomeRuleDef & Component,
      );
    });
  }

  private getComponent<T extends ComponentKind>(
    def: ComponentObject<T>,
  ): Component<T> {
    return this.pluginRegistry.getComponent(def);
  }
}

const debug = Debug('midnight-smoker:smoker');
