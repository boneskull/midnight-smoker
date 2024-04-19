/**
 * Provides {@link Smoker}, which is the main class of `midnight-smoker`.
 *
 * Typically the user-facing point of entry when used programmatically.
 *
 * @packageDocumentation
 */

/* eslint-disable no-labels */
import {RuleSeverities} from '#constants';
import {
  InvalidArgError,
  type InstallError,
  type PackError,
  type PackParseError,
  type RuleError,
  type ScriptError,
} from '#error';
import {type SmokerEvents, type StrictEmitter} from '#event';
import type {RawSmokerOptions, SmokerOptions} from '#options/options';
import {OptionParser} from '#options/parser';
import {
  BLESSED_PLUGINS,
  PluginRegistry,
  isBlessedPlugin,
  type StaticPluginMetadata,
} from '#plugin';
import {type LintResult} from '#schema/lint-result';
import type {RunScriptResult} from '#schema/run-script-result';
import {type SmokeResults} from '#schema/smoker-event';
import {castArray} from '#util/schema-util';
import Debug from 'debug';
import {createActor, toPromise} from 'xstate';
import {
  type Component,
  type PkgManagerDef,
  type ReporterDef,
  type SomeRuleDef,
} from './component';
import {
  ControlMachine,
  type CtrlMachineOutput,
} from './machine/controller/control-machine';
import {isMachineOutputOk} from './machine/machine-util';
import {FileManager} from './util/filemanager';

type SetupResult =
  | {
      error: Error;
    }
  | undefined;

export type SmokerEmitter = StrictEmitter<SmokerEvents>;

/**
 * Currently, capabilities are for testing purposes because it's a huge pain to
 * make them do much more than that.
 *
 * This allows a prebuilt {@link PluginRegistry} to be provided when creating a
 * {@link Smoker} instance.
 */
export interface SmokerCapabilities {
  pluginRegistry?: PluginRegistry;
  fileManager?: FileManager;
}

/**
 * The main class.
 */
export class Smoker {
  /**
   * List of extra dependencies to install
   */
  private readonly add: string[];

  /**
   * Whether to run against all workspaces
   */
  private readonly allWorkspaces: boolean;

  /**
   * Whether to bail on the first script failure
   */
  private readonly bail: boolean;

  /**
   * Whether to include the workspace root
   */
  private readonly includeWorkspaceRoot;

  /**
   * Whether to keep temp dirs around (debugging purposes)
   */
  private readonly linger: boolean;

  /**
   * @internal
   */

  /**
   * Mapping of plugin identifiers (names) to plugin "instances", which can
   * contain a collection of rules and other stuff (in the future)
   */
  private readonly pluginRegistry: PluginRegistry;

  private readonly reporters: Set<string>;

  /**
   * Whether or not to run checks
   */
  private readonly shouldLint: boolean;

  /**
   * List of specific workspaces to run against
   */
  private readonly workspaces: string[];

  /**
   * Used for emitting {@link SmokerEvent.SmokeOk} or
   * {@link SmokerEvent.SmokeFailed}
   */
  public readonly opts: Readonly<SmokerOptions>;

  /**
   * List of scripts to run in each workspace
   */
  public readonly scripts: string[];

  private readonly fileManager: FileManager;

  private constructor(
    opts: SmokerOptions,
    {
      pluginRegistry = PluginRegistry.create(),
      fileManager = FileManager.create(),
    }: SmokerCapabilities = {},
  ) {
    const {
      script,
      linger,
      includeRoot,
      add,
      bail,
      all,
      workspace,
      lint,
      reporter,
    } = opts;
    this.opts = Object.freeze(opts);
    this.scripts = script;
    this.linger = linger;
    this.includeWorkspaceRoot = includeRoot;
    this.add = add;
    this.bail = bail;
    this.allWorkspaces = all;
    this.workspaces = workspace;
    this.shouldLint = lint;
    this.reporters = new Set(reporter);
    this.fileManager = fileManager;

    /**
     * Normally, the CLI will intercept this before we get here
     */
    if (this.allWorkspaces && this.workspaces.length) {
      throw new InvalidArgError(
        'Option "workspace" is mutually exclusive with "all" and/or "includeRoot"',
      );
    }

    this.pluginRegistry = pluginRegistry;

    debug(`Smoker instantiated with registry: ${this.pluginRegistry}`);
  }

  public [Symbol.dispose]() {}

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
    const {pluginRegistry, options} = await Smoker.bootstrap(
      opts,
      caps.pluginRegistry,
    );
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
    return smoker.pluginRegistry.plugins;
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

  private getComponent(def: object) {
    return this.pluginRegistry.getComponent(def);
  }

  public getPkgManagerDefs() {
    return this.pluginRegistry.pkgManagerDefs;
  }

  public async lint(): Promise<SmokeResults | undefined> {
    try {
      await this.preRun();
    } catch (err) {
      return await this.postRun({error: err as Error});
    }

    try {
      let ruleResults: LintResult | undefined;
      const runScriptResults: RunScriptResult[] = [];
      // await this.runLint();

      return await this.postRun(undefined, ruleResults, runScriptResults);
    } catch (err) {
      // await this.eventBus.emit(SmokerEvent.UnknownError, {
      //   error: fromUnknownError(err),
      // });
    } finally {
      // await this.cleanup();
    }
  }

  // private async cleanup() {
  //   await this.pkgManagerController.destroy();
  //   await this.eventBus.emit(SmokerEvent.BeforeExit, {});
  // }

  // /**
  //  * For each package manager, creates a tarball for one or more packages
  //  */
  // public async pack(): Promise<void> {
  //   await this.pkgManagerController.pack({
  //     allWorkspaces: this.allWorkspaces,
  //     workspaces: this.workspaces,
  //     includeWorkspaceRoot: this.includeWorkspaceRoot,
  //   });
  // }

  // /**
  //  * Runs automated checks against the installed packages
  //  *
  //  * @param installResults - The result of {@link Smoker.install}
  //  * @returns Result of running all enabled rules on all installed packages
  //  */
  // public async runLint(): Promise<LintResult> {
  //   const lintController =
  //     this.lintController ??
  //     LintController.create(
  //       this.pluginRegistry,
  //       this.eventBus,
  //       this.pkgManagerController.pkgManagers,
  //       this.getEnabledRules(),
  //       this.opts.rules,
  //     );
  //   debug(
  //     'Running enabled rules: %s',
  //     lintController.rules.map((rule) => rule.id).join(', '),
  //   );
  //   return lintController.lint();
  // }

  // /**
  //  * Runs the script for each package in `packItems`
  //  */
  // public async runScripts(): Promise<RunScriptResult[]> {
  //   return this.pkgManagerController.runScripts(this.scripts, {
  //     bail: this.bail,
  //   });
  // }

  /**
   * Pack, install, run checks (optionally), and run scripts (optionally)
   *
   * @returns Results
   */
  public async smoke(): Promise<SmokeResults | undefined> {
    const controller = createActor(ControlMachine, {
      id: 'smoke',
      input: {
        fileManager: this.fileManager,
        smokerOptions: this.opts,
        pluginRegistry: this.pluginRegistry,
      },
      logger: Debug('midnight-smoker:controller'),
    });

    controller.start();

    if (this.shouldLint) {
      controller.send({type: 'LINT'});
    }

    if (this.scripts.length) {
      controller.send({type: 'RUN_SCRIPTS', scripts: this.scripts});
    }

    controller.send({type: 'HALT'});

    const output = (await toPromise(controller)) as CtrlMachineOutput;

    if (isMachineOutputOk(output)) {
      return {
        scripts: output.runScriptResults,
        lint: output.lintResult,
        plugins: this.pluginRegistry.plugins,
        opts: this.opts,
      };
    }
  }

  /**
   * Boots up the smoker with the provided options and plugin registry.
   *
   * Several things have to happen, in order, before we can start smoking:
   *
   * 1. Assuming we have no prebuilt registry, built-in plugins must
   *    {@link PluginRegistry.loadPlugins be loaded}
   * 2. Assuming we have no prebuilt registry, external plugins then must be
   *    loaded.
   * 3. The registry must refuse further registrations.
   * 4. {@link OptionParser.parse Parse} the options.
   *
   * @param opts - The options for the smoker.
   * @param pluginRegistry - The plugin registry for the smoker.
   * @returns An object containing the plugin registry and parsed options.
   * @internal
   */
  private static async bootstrap(
    this: void,
    opts: RawSmokerOptions = {},
    pluginRegistry?: PluginRegistry,
  ) {
    const plugins = castArray(opts.plugin).filter(
      (requested) => !isBlessedPlugin(requested),
    );
    debug('Requested external plugins: %O', plugins);

    if (!pluginRegistry) {
      pluginRegistry = PluginRegistry.create();
      // this must be done in sequence to protect the blessed plugins
      await pluginRegistry.loadPlugins(BLESSED_PLUGINS);
      await pluginRegistry.loadPlugins(plugins);
    }

    // disable new registrations
    pluginRegistry.close();

    debug('Loaded %d plugin(s)', pluginRegistry.plugins.length);

    return {
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
      return plugin.ruleDefs.map((def) => ({
        ...def,
        ...this.getComponent(def),
      }));
    });
  }

  /**
   * @param setupResult
   * @param ruleResults
   * @param runScriptResults
   * @returns
   * @todo Fix this, I hate this
   */
  private async postRun(
    setupResult: SetupResult,
    ruleResults?: LintResult,
    runScriptResults: RunScriptResult[] = [],
  ) {
    // END
    const smokeResults: SmokeResults = {
      scripts: runScriptResults,
      lint: ruleResults,
      plugins: this.pluginRegistry.plugins,
      opts: this.opts,
    };

    const aggregateErrors = () => {
      const runScriptErrors = runScriptResults.reduce<ScriptError[]>(
        (acc, result) => (result.error ? [...acc, result.error] : acc),
        [],
      );

      const ruleErrors = castArray(ruleResults?.issues).reduce<RuleError[]>(
        (acc, issue) => {
          return issue.severity === RuleSeverities.Error
            ? [...acc, issue.error as RuleError]
            : acc;
        },
        [],
      );

      const errors: Array<
        InstallError | PackError | PackParseError | ScriptError | RuleError
      > = [];
      if (setupResult) {
        errors.push(
          setupResult.error as InstallError | PackError | PackParseError,
        );
      }
      errors.push(...runScriptErrors, ...ruleErrors);
      return errors;
    };

    const errors = aggregateErrors();

    if (errors.length) {
      // await this.eventBus.emit(SmokerEvent.SmokeFailed, {
      //   plugins: this.pluginRegistry.plugins,
      //   opts: this.opts,
      //   error: new SmokeFailedError('🤮 Maurice!', errors, {
      //     results: smokeResults,
      //   }),
      // });
    } else {
      // await this.eventBus.emit(SmokerEvent.SmokeOk, smokeResults);
    }

    return smokeResults;
  }

  private async preRun(): Promise<void> {
    // await Promise.all([
    //   this.reporterController.init().then(() => {
    //     debug('Reporters initialized');
    //   }),
    //   this.pkgManagerController.init().then(() => {
    //     debug('Package managers initialized');
    //   }),
    // ]);

    // await this.eventBus.emit(SmokerEvent.SmokeBegin, {
    //   plugins: this.pluginRegistry.plugins,
    //   opts: this.opts,
    // });

    debug('Beginning packing phase');

    // PACK
    // await this.pack();
    debug('Beginning installation phase');

    // INSTALL
    // await this.install();
  }
}

const debug = Debug('midnight-smoker:smoker');
