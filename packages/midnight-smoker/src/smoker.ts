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
import {type SmokeResults} from '#event';
import type {RawSmokerOptions, SmokerOptions} from '#options/options';
import {OptionParser} from '#options/parser';
import {
  BLESSED_PLUGINS,
  PluginRegistry,
  isBlessedPlugin,
  type StaticPluginMetadata,
} from '#plugin';
import {type LintResult} from '#schema/rule-result';
import type {RunScriptResult} from '#schema/run-script-result';
import {castArray} from '#util/schema-util';
import Debug from 'debug';
import {isEmpty} from 'lodash';
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
import {isActorOutputOk} from './machine/util';
import {FileManager} from './util/filemanager';

type SetupResult =
  | {
      error: Error;
    }
  | undefined;

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

  // /**
  //  * Whether to include the workspace root
  //  */
  // private readonly includeWorkspaceRoot;

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

  public readonly cwd: string;

  private constructor(
    opts: SmokerOptions,
    {
      pluginRegistry = PluginRegistry.create(),
      fileManager = FileManager.create(),
    }: SmokerCapabilities = {},
  ) {
    const {script, linger, add, bail, all, workspace, lint, cwd} = opts;
    this.opts = Object.freeze(opts);
    this.scripts = script;
    this.cwd = cwd;
    this.linger = linger;
    this.add = add;
    this.bail = bail;
    this.allWorkspaces = all;
    this.workspaces = workspace;
    this.shouldLint = lint;
    this.fileManager = fileManager;

    /**
     * Normally, the CLI will intercept this before we get here
     */
    if (this.allWorkspaces && this.workspaces.length) {
      throw new InvalidArgError(
        'Option "workspace" is mutually exclusive with "all"',
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
      const ruleResults: LintResult[] = [];
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
    const {
      pluginRegistry,
      fileManager,
      opts: smokerOptions,
      scripts,
      shouldLint,
    } = this;

    const controller = createActor(ControlMachine, {
      id: 'smoke',
      input: {
        fileManager,
        smokerOptions,
        pluginRegistry,
      },
      logger: Debug('midnight-smoker:controller'),
      inspect(evt) {
        if (evt.type === '@xstate.event') {
          // debug(evt.event);
        }
      },
    }).start();

    if (shouldLint) {
      controller.send({type: 'LINT'});
    }

    if (!isEmpty(scripts)) {
      controller.send({type: 'RUN_SCRIPTS', scripts});
    }

    controller.send({type: 'HALT'});

    const output = (await toPromise(controller)) as CtrlMachineOutput;

    if (isActorOutputOk(output)) {
      debug({
        scripts: output.runScriptResults,
        lint: output.lintResults,
        plugins: pluginRegistry.plugins,
        opts: smokerOptions,
      });
      return {
        scripts: output.runScriptResults,
        lint: output.lintResults,
        plugins: pluginRegistry.plugins,
        opts: smokerOptions,
      };
    } else {
      debug('no results');
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
      await pluginRegistry.loadPlugins(BLESSED_PLUGINS);
      await pluginRegistry.loadPlugins(plugins);
    }

    // disable new registrations
    pluginRegistry.close();

    debug('Loaded %d plugin(s)', pluginRegistry.plugins.length);

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
   * @param lintResults
   * @param runScriptResults
   * @returns
   * @todo Fix this, I hate this
   */
  private async postRun(
    setupResult: SetupResult,
    lintResults?: LintResult[],
    runScriptResults: RunScriptResult[] = [],
  ) {
    // END
    const smokeResults: SmokeResults = {
      scripts: runScriptResults,
      lint: lintResults,
      plugins: this.pluginRegistry.plugins,
      opts: this.opts,
    };

    const aggregateErrors = () => {
      const runScriptErrors = runScriptResults.reduce<ScriptError[]>(
        (acc, result) => (result.error ? [...acc, result.error] : acc),
        [],
      );

      const ruleErrors =
        lintResults?.flatMap<RuleError>((result) => {
          return result.type === 'FAILED'
            ? result.results.reduce<RuleError[]>((acc, result) => {
                return result.type === 'FAILED' &&
                  result.ctx.severity === RuleSeverities.Error
                  ? [...acc, result.error as RuleError]
                  : acc;
              }, [])
            : [];
        }) ?? [];

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
}

const debug = Debug('midnight-smoker:smoker');
