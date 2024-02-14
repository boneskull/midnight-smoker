/**
 * Provides {@link Smoker}, which is the main class of `midnight-smoker`.
 *
 * Typically the user-facing point of entry when used programmatically.
 *
 * @packageDocumentation
 */

/* eslint-disable no-labels */
import {type Component} from '#component';
import {RuleSeverities} from '#constants';
import {
  CleanupError,
  InstallError,
  InvalidArgError,
  PackError,
  ReporterError,
  SmokeFailedError,
  fromUnknownError,
  type RuleError,
  type ScriptError,
} from '#error';
import {
  InstallEvent,
  PackEvent,
  RunScriptEvent,
  SmokerEvent,
  createStrictEmitter,
  type SmokeResults,
  type SmokerEvents,
  type StrictEmitter,
} from '#event';
import {Blessed, PluginRegistry, type StaticPluginMetadata} from '#plugin';
import {createRuleRunnerNotifiers} from '#rule-runner';
import type {PkgManagerInstallManifest} from '#schema/install-manifest';
import type {InstallResult} from '#schema/install-result';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type ReporterDef} from '#schema/reporter-def';
import {type SomeRule} from '#schema/rule';
import {type RunRulesManifest} from '#schema/rule-runner-manifest';
import {type RunRulesResult} from '#schema/rule-runner-result';
import type {RunScriptResult} from '#schema/run-script-result';
import {isErrnoException} from '#util/error-util';
import {readSmokerPkgJson} from '#util/pkg-util';
import {castArray} from '#util/schema-util';
import Debug from 'debug';
import {isFunction} from 'lodash';
import {Console} from 'node:console';
import fs from 'node:fs/promises';
import type {PkgManagerController} from './controller/controller';
import {SmokerPkgManagerController} from './controller/smoker-controller';
import type {RawSmokerOptions, SmokerOptions} from './options/options';
import {OptionParser} from './options/parser';

const debug = Debug('midnight-smoker:smoker');

export type SmokerEmitter = StrictEmitter<SmokerEvents>;

/**
 * Currently, capabilities are for testing purposes because it's a huge pain to
 * make them do much more than that.
 *
 * This allows a prebuilt {@link PluginRegistry} to be provided when creating a
 * {@link Smoker} instance.
 */
export interface SmokerCapabilities {
  registry?: PluginRegistry;
  pkgManagerController?: PkgManagerController;
}

type SetupResult =
  | {
      error: PackError | InstallError;
    }
  | {
      installResults: InstallResult[];
    };

/**
 * The main class.
 */
export class Smoker extends createStrictEmitter<SmokerEvents>() {
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
   * Whether or not to run checks
   */
  private readonly shouldLint: boolean;

  /**
   * Whether to include the workspace root
   */
  private readonly includeWorkspaceRoot;

  /**
   * Whether to keep temp dirs around (debugging purposes)
   */
  private readonly linger: boolean;

  /**
   * Mapping of plugin identifiers (names) to plugin "instances", which can
   * contain a collection of rules and other stuff (in the future)
   */
  private readonly pluginRegistry: PluginRegistry;

  /**
   * @internal
   */
  private readonly pkgManagerController: PkgManagerController;
  private readonly reporters: Set<string>;

  /**
   * List of specific workspaces to run against
   */
  private readonly workspaces: string[];

  private reporterDelegate?: Readonly<SmokerEmitter>;

  /**
   * Used for emitting {@link SmokerEvent.SmokeOk} or
   * {@link SmokerEvent.SmokeFailed}
   */
  public readonly opts: Readonly<SmokerOptions>;

  /**
   * List of scripts to run in each workspace
   */
  public readonly scripts: string[];

  private readonly ruleRunnerId: string;

  private readonly scriptRunnerId: string;

  private constructor(
    opts: SmokerOptions,
    pluginRegistry = PluginRegistry.create(),
    pmController?: PkgManagerController,
  ) {
    super();
    const {
      script,
      linger,
      includeRoot,
      add,
      bail,
      all,
      workspace,
      ruleRunner,
      scriptRunner,
      lint,
      reporter: reporters,
    } = opts;
    this.opts = Object.freeze(opts);
    this.ruleRunnerId = ruleRunner;
    this.scriptRunnerId = scriptRunner;
    this.scripts = script;
    this.linger = linger;
    this.includeWorkspaceRoot = includeRoot;
    this.add = add;
    this.bail = bail;
    this.allWorkspaces = all;
    this.workspaces = workspace;
    this.shouldLint = lint;
    this.reporters = new Set(reporters);

    /**
     * Normally, the CLI will intercept this before we get here
     */
    if (this.allWorkspaces && this.workspaces.length) {
      throw new InvalidArgError(
        'Option "workspace" is mutually exclusive with "all" and/or "includeRoot"',
      );
    }

    this.pluginRegistry = pluginRegistry;
    this.pkgManagerController =
      pmController ??
      new SmokerPkgManagerController(pluginRegistry, opts.pkgManager, {
        verbose: opts.verbose,
        loose: opts.loose,
        defaultExecutorId: opts.executor,
      });

    debug(`Smoker instantiated with registry: ${this.pluginRegistry}`);
  }

  /**
   * Initializes a {@link Smoker} instance.
   */
  public static async create(this: void, opts?: RawSmokerOptions) {
    const {pluginRegistry, options} = await Smoker.bootstrap(opts);
    return new Smoker(options, pluginRegistry);
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
    const {registry, pkgManagerController: pmController} = caps;
    const {pluginRegistry, options} = await Smoker.bootstrap(opts, registry);
    return new Smoker(options, pluginRegistry, pmController);
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
  ): Promise<Component<ReporterDef>[]> {
    const smoker = await Smoker.create(opts);
    return smoker.getReporters();
  }

  public static async getPlugins(
    this: void,
    opts?: RawSmokerOptions,
  ): Promise<StaticPluginMetadata[]> {
    const smoker = await Smoker.create(opts);
    return smoker.pluginRegistry.plugins;
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
  ): Promise<Component<SomeRule>[]> {
    const smoker = await Smoker.create(opts);
    return smoker.getRules();
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

  public getPkgManagerDefs() {
    return this.pluginRegistry.pkgManagerDefs;
  }

  public static async getPkgManagerDefs(
    this: void,
    opts: RawSmokerOptions = {},
  ): Promise<Component<PkgManagerDef>[]> {
    const smoker = await Smoker.create(opts);
    return smoker.getPkgManagerDefs();
  }

  /**
   * Cleans up temp directories associated with package managers.
   *
   * If the {@link SmokerOptions.linger} option is set to `true`, this method
   * will _not_ clean up the directories, but will instead emit a
   * {@link SmokerEvent.Lingered Lingered} event.
   *
   * @todo The specific cleanup mechanism should be moved to the package manager
   *   implementation.
   */
  public async cleanup(): Promise<void> {
    const pkgManagers = await this.pkgManagerController.getPkgManagers();
    if (!this.linger) {
      await Promise.all(
        pkgManagers.map(async (pm) => {
          const {tmpdir} = pm;
          try {
            await fs.rm(tmpdir, {recursive: true, force: true});
          } catch (err) {
            if (isErrnoException(err)) {
              if (err.code !== 'ENOENT') {
                throw new CleanupError(
                  `Failed to clean temp directory ${tmpdir}`,
                  tmpdir,
                  err,
                );
              }
            } else {
              throw err;
            }
          }
        }),
      );
    } else if (pkgManagers.length) {
      const lingered = pkgManagers.map((pm) => pm.tmpdir);
      debug('Leaving %d temp dirs on disk: %O', lingered.length, lingered);
      await Promise.resolve();
      this.emit(
        SmokerEvent.Lingered,
        pkgManagers.map((pm) => pm.tmpdir),
      );
    }
  }

  /**
   * Creates a listener delegate for this instance.
   *
   * This is used to give `Listener` functions something they can listen for
   * events on but not screw with anything else. Kind of a half-measure until
   * `Listeners` become components in their own right.
   *
   * This doesn't lock down the instance that much. Maybe we should just return
   * an object of `{once, on}` bound to `Smoker`.
   *
   * @returns {SmokerEmitter} The created listener delegate.
   * @internal
   */
  public createReporterDelegate(): Readonly<SmokerEmitter> {
    const delegate: SmokerEmitter =
      new (class extends createStrictEmitter<SmokerEvents>() {})();
    const emit = delegate.emit.bind(delegate);
    for (const event of Object.values(SmokerEvent)) {
      this.on(event, (...args) => {
        emit(event, ...args);
      });
    }
    delegate.emit = new Proxy(delegate.emit, {
      apply() {},
    });
    return delegate;
  }

  public getEnabledReporters() {
    return this.pluginRegistry.reporters.filter(
      (reporter) =>
        this.reporters.has(reporter.id) ||
        (reporter.when ? reporter.when(this.opts) : false),
    );
  }

  public getReporters() {
    return this.pluginRegistry.reporters.filter(
      (reporter) => reporter.isHidden !== true,
    );
  }

  public getRules() {
    return this.pluginRegistry.getRules();
  }

  /**
   * Installs from tarball in a temp dir
   */
  public async install(
    installManifests: PkgManagerInstallManifest[],
  ): Promise<InstallResult[]> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!installManifests?.length) {
      throw new InvalidArgError('Non-empty "manifests" arg is required', {
        argName: 'manifests',
      });
    }

    for (const evt of Object.values(InstallEvent)) {
      this.pkgManagerController.addListener(evt, (...args) => {
        this.emit(evt, ...args);
      });
    }

    try {
      return await this.pkgManagerController.install(
        installManifests,
        this.add,
      );
    } finally {
      for (const evt of Object.values(InstallEvent)) {
        this.pkgManagerController.removeAllListeners(evt);
      }
    }
  }

  public async loadListeners(): Promise<void> {
    if (this.reporterDelegate) {
      return;
    }
    const {opts} = this;
    const reporterDefs = this.getEnabledReporters();
    const emitter = (this.reporterDelegate = this.createReporterDelegate());

    const pkgJson = await readSmokerPkgJson();
    await Promise.all([
      reporterDefs.map(async (def) => {
        let stdout: NodeJS.WritableStream = process.stdout;
        let stderr: NodeJS.WritableStream = process.stderr;
        if (def.stdout) {
          if (isFunction(def.stdout)) {
            stdout = await def.stdout();
          } else {
            stdout = def.stdout;
          }
        }
        if (def.stderr) {
          if (isFunction(def.stderr)) {
            stderr = await def.stderr();
          } else {
            stderr = def.stderr;
          }
        }

        const console = new Console({stdout, stderr});

        try {
          await def.reporter({
            emitter,
            opts,
            pkgJson,
            console,
            stdout,
            stderr,
          });
        } catch (err) {
          throw new ReporterError(fromUnknownError(err), def);
        }
      }),
    ]);
  }

  /**
   * For each package manager, creates a tarball for one or more packages
   */
  public async pack(): Promise<PkgManagerInstallManifest[]> {
    for (const evt of Object.values(PackEvent)) {
      this.pkgManagerController.addListener(evt, (...args) => {
        this.emit(evt, ...args);
      });
    }

    try {
      return await this.pkgManagerController.pack({
        allWorkspaces: this.allWorkspaces,
        workspaces: this.workspaces,
        includeWorkspaceRoot: this.includeWorkspaceRoot,
      });
    } finally {
      for (const evt of Object.values(PackEvent)) {
        this.pkgManagerController.removeAllListeners(evt);
      }
    }
  }

  /**
   * Runs automated checks against the installed packages
   *
   * @param installResults - The result of {@link Smoker.install}
   * @returns Result of running all enabled rules on all installed packages
   */
  public async runChecks(
    installResults: InstallResult[],
  ): Promise<RunRulesResult> {
    const rules = this.pluginRegistry.getRules(
      (rule) => this.opts.rules[rule.id].severity !== RuleSeverities.Off,
    );

    debug('Running enabled rules: %s', rules.map((rule) => rule.id).join(', '));

    const runRulesManifest: RunRulesManifest = installResults.flatMap(
      ({installManifests}) => {
        // we don't need to inspect the same package twice, so we pick the first
        // installPath for each pkgName encountered. we also want to ignore
        // "additional dependencies".

        // TODO: this can be simplified
        const uniquePkgNameMap = installManifests.reduce<
          Map<string, {pkgName: string; installPath: string}>
        >((acc, {isAdditional, spec, installPath, pkgName}) => {
          if (!isAdditional && !acc.has(pkgName)) {
            // c8 ignore next
            if (!installPath) {
              throw new TypeError(
                `Expected an installPath for ${pkgName} (${spec})`,
              );
            }
            acc.set(pkgName, {pkgName, installPath});
          }
          return acc;
        }, new Map());
        return [...uniquePkgNameMap.values()];
      },
    );

    const ruleRunner = this.pluginRegistry.getRuleRunner(this.ruleRunnerId);

    return ruleRunner(
      createRuleRunnerNotifiers(this),
      rules,
      this.opts.rules,
      runRulesManifest,
    );
  }

  /**
   * Runs the script for each package in `packItems`
   */
  public async runScripts(
    installResults: InstallResult[],
  ): Promise<RunScriptResult[]> {
    for (const evt of Object.values(RunScriptEvent)) {
      this.pkgManagerController.on(evt, (...args) => {
        this.emit(evt, ...args);
      });
    }

    try {
      return await this.pkgManagerController.runScripts(
        this.scripts,
        installResults,
        {
          bail: this.bail,
          scriptRunnerId: this.scriptRunnerId,
        },
      );
    } finally {
      for (const evt of Object.values(RunScriptEvent)) {
        this.pkgManagerController.removeAllListeners(evt);
      }
    }
  }

  private async preRun(): Promise<SetupResult> {
    await this.loadListeners();

    this.emit(SmokerEvent.SmokeBegin, {
      plugins: this.pluginRegistry.plugins,
      opts: this.opts,
    });

    let pkgManagerInstallManifests: PkgManagerInstallManifest[] | undefined;
    let installResults: InstallResult[];

    // PACK
    try {
      pkgManagerInstallManifests = await this.pack();
    } catch (err) {
      if (!(err instanceof PackError)) {
        throw err;
      }
      return {error: err};
    }

    // INSTALL
    try {
      installResults = await this.install(pkgManagerInstallManifests);
    } catch (err) {
      if (!(err instanceof InstallError)) {
        throw err;
      }
      return {error: err};
    }
    return {installResults};
  }

  public async lint(): Promise<SmokeResults | undefined> {
    try {
      const setupResult = await this.preRun();

      let ruleResults: RunRulesResult | undefined;
      const runScriptResults: RunScriptResult[] = [];

      if ('installResults' in setupResult) {
        const {installResults} = setupResult;
        ruleResults = await this.runChecks(installResults);
      }

      return await this.postRun(setupResult, ruleResults, runScriptResults);
    } catch (err) {
      this.emit(SmokerEvent.UnknownError, fromUnknownError(err));
    } finally {
      this.emit(SmokerEvent.End);
      this.unloadListeners();
    }
  }

  private async postRun(
    setupResult: SetupResult,
    ruleResults?: RunRulesResult,
    runScriptResults: RunScriptResult[] = [],
  ) {
    // END
    const smokeResults: SmokeResults = {
      scripts: runScriptResults,
      checks: ruleResults,
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

      const errors: Array<InstallError | PackError | ScriptError | RuleError> =
        [];
      if ('error' in setupResult) {
        errors.push(setupResult.error);
      }
      errors.push(...runScriptErrors, ...ruleErrors);
      return errors;
    };

    // this triggers the "Lingered" event which must happen before
    // the final "SmokeOK" or "SmokeFailed" event, or there could be a race condition.
    try {
      await this.cleanup();
    } catch {
      // TODO: handle
    }

    const errors = aggregateErrors();

    if (errors.length) {
      this.emit(
        SmokerEvent.SmokeFailed,
        new SmokeFailedError('🤮 Maurice!', errors, {results: smokeResults}),
      );
    } else {
      this.emit(SmokerEvent.SmokeOk, smokeResults);
    }

    return smokeResults;
  }

  /**
   * Pack, install, run checks (optionally), and run scripts (optionally)
   *
   * @returns Results
   */
  public async smoke(): Promise<SmokeResults | undefined> {
    try {
      const setupResult = await this.preRun();

      let ruleResults: RunRulesResult | undefined;
      let runScriptResults: RunScriptResult[] = [];

      if ('installResults' in setupResult) {
        const {installResults} = setupResult;
        // RUN CHECKS
        if (this.shouldLint) {
          ruleResults = await this.runChecks(installResults);
        }

        // RUN SCRIPTS
        if (this.scripts.length) {
          runScriptResults = await this.runScripts(installResults);
        }
      }

      return await this.postRun(setupResult, ruleResults, runScriptResults);
    } catch (err) {
      this.emit(SmokerEvent.UnknownError, fromUnknownError(err));
    } finally {
      this.emit(SmokerEvent.End);
      this.unloadListeners();
    }
  }

  public unloadListeners(): void {
    this.reporterDelegate?.removeAllListeners();
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
   * @param registry - The plugin registry for the smoker.
   * @returns An object containing the plugin registry and parsed options.
   * @internal
   */
  private static async bootstrap(
    this: void,
    opts: RawSmokerOptions = {},
    registry?: PluginRegistry,
  ) {
    const plugins = castArray(opts.plugin).filter(
      (requested) => !Blessed.isBlessedPlugin(requested),
    );
    debug('Requested external plugins: %O', plugins);

    if (!registry) {
      registry = PluginRegistry.create();
      // this must be done in sequence to protect the blessed plugins
      await registry.loadPlugins(Blessed.BLESSED_PLUGINS);
      await registry.loadPlugins(plugins);
    }

    // disable new registrations
    registry.close();

    debug('Loaded %d plugin(s)', registry.plugins.length);

    return {
      pluginRegistry: registry,
      options: OptionParser.create(registry).parse(opts),
    };
  }
}
