/**
 * Provides {@link Smoker}, which is the main class of `midnight-smoker`.
 *
 * Typically the user-facing point of entry when used programmatically.
 *
 * @packageDocumentation
 */

/* eslint-disable no-labels */
import Debug from 'debug';
import {isFunction} from 'lodash';
import {Console} from 'node:console';
import fs from 'node:fs/promises';
import type {
  Component,
  PkgManagerDef,
  ReporterDef,
  RunRulesManifest,
  RunRulesResult,
  SomeRule,
} from './component';
import {RuleSeverities} from './component';
import type {PkgManagerController} from './component/package-manager/controller';
import {SmokerPkgManagerController} from './component/package-manager/controller';
import {createRuleRunnerNotifiers} from './component/rule-runner/rule-runner-notifier';
import type {
  InstallResult,
  PkgManagerInstallManifest,
  RunScriptResult,
} from './component/schema/pkg-manager-schema';
import {InvalidArgError} from './error/common-error';
import type {InstallError} from './error/install-error';
import type {PackError} from './error/pack-error';
import {ReporterError} from './error/reporter-error';
import type {RuleError} from './error/rule-error';
import type {ScriptError} from './error/script-error';
import {CleanupError, SmokeFailedError} from './error/smoker-error';
import {
  InstallEvent,
  PackEvent,
  RunScriptEvent,
  SmokerEvent,
} from './event/event-constants';
import type {SmokeResults, SmokerEvents} from './event/event-types';
import type {StrictEmitter} from './event/strict-emitter';
import {createStrictEmitter} from './event/strict-emitter';
import {OptionParser} from './options';
import type {RawSmokerOptions, SmokerOptions} from './options/options';
import {readSmokerPkgJson} from './pkg-util';
import {BLESSED_PLUGINS, isBlessedPlugin} from './plugin/blessed';
import {PluginRegistry} from './plugin/registry';
import type {StaticPluginMetadata} from './plugin/static-metadata';
import {castArray} from './schema-util';

const debug = Debug('midnight-smoker:smoker');

export type SmokerEmitter = StrictEmitter<SmokerEvents>;

export interface SmokerCapabilities {
  registry?: PluginRegistry;
  pmController?: PkgManagerController;
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
  private readonly enableChecks: boolean;
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
  private readonly pmController: PkgManagerController;
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
      lint: checks,
      reporter: reporters,
    } = opts;
    this.opts = Object.freeze(opts);

    this.scripts = script;
    this.linger = linger;
    this.includeWorkspaceRoot = includeRoot;
    this.add = add;
    this.bail = bail;
    this.allWorkspaces = all;
    this.workspaces = workspace;
    this.enableChecks = checks;
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
    this.pmController =
      pmController ??
      new SmokerPkgManagerController(pluginRegistry, opts.pkgManager, {
        verbose: opts.verbose,
        loose: opts.loose,
        executorId: opts.executor,
      });

    debug(
      'Smoker instantiated with %d plugins',
      this.pluginRegistry.plugins.length,
    );
    debug(`${this.pluginRegistry}`);
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
    const {registry, pmController} = caps;
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
   * If the {@linkcode SmokerOptions.linger} option is set to `true`, this method
   * will _not_ clean up the directories, but will instead emit a
   * {@linkcode SmokerEvent.Lingered Lingered} event.
   *
   * @todo The specific cleanup mechanism should be moved to the package manager
   *   implementation.
   */
  public async cleanup(): Promise<void> {
    const pkgManagers = await this.pmController.getPkgManagers();
    if (!this.linger) {
      await Promise.all(
        pkgManagers.map(async (pm) => {
          const {tmpdir} = pm;
          try {
            await fs.rm(tmpdir, {recursive: true, force: true});
          } catch (e) {
            const err = e as NodeJS.ErrnoException;
            if (err.code !== 'ENOENT') {
              throw new CleanupError(
                `Failed to clean temp directory ${tmpdir}`,
                tmpdir,
                err,
              );
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

  public getEnabledReporterDefs() {
    return this.pluginRegistry.reporters.filter(
      (listener) =>
        this.reporters.has(listener.id) ||
        (listener.when ? listener.when(this.opts) : false),
    );
  }

  public getReporters() {
    return this.pluginRegistry.reporters.filter(
      (listener) => listener.isReporter !== false,
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
      this.pmController.addListener(evt, (...args) => {
        this.emit(evt, ...args);
      });
    }

    try {
      return await this.pmController.install(installManifests, this.add);
    } finally {
      for (const evt of Object.values(InstallEvent)) {
        this.pmController.removeAllListeners(evt);
      }
    }
  }

  public async loadListeners(): Promise<void> {
    if (this.reporterDelegate) {
      return;
    }
    const {opts} = this;
    const reporterDefs = this.getEnabledReporterDefs();
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
          throw new ReporterError(err as Error, def);
        }
      }),
    ]);
  }

  /**
   * For each package manager, creates a tarball for one or more packages
   */
  public async pack(): Promise<PkgManagerInstallManifest[]> {
    for (const evt of Object.values(PackEvent)) {
      this.pmController.addListener(evt, (...args) => {
        this.emit(evt, ...args);
      });
    }

    try {
      return await this.pmController.pack({
        allWorkspaces: this.allWorkspaces,
        workspaces: this.workspaces,
        includeWorkspaceRoot: this.includeWorkspaceRoot,
      });
    } finally {
      for (const evt of Object.values(PackEvent)) {
        this.pmController.removeAllListeners(evt);
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
        const uniquePkgNameMap = installManifests.reduce<Map<string, string>>(
          (acc, {isAdditional, spec, installPath, pkgName}) => {
            if (!isAdditional && !acc.has(pkgName)) {
              /* istanbul ignore next */
              if (!installPath) {
                throw new TypeError(
                  `Expected an installPath for ${pkgName} (${spec})`,
                );
              }
              acc.set(pkgName, installPath);
            }
            return acc;
          },
          new Map(),
        );
        return [...uniquePkgNameMap.values()];
      },
    );

    const ruleRunner = this.pluginRegistry.getRuleRunner();
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
      this.pmController.on(evt, (...args) => {
        this.emit(evt, ...args);
      });
    }

    try {
      return await this.pmController.runScripts(this.scripts, installResults, {
        bail: this.bail,
      });
    } finally {
      for (const evt of Object.values(RunScriptEvent)) {
        this.pmController.removeAllListeners(evt);
      }
    }
  }

  private async preRun(): Promise<SetupResult> {
    await this.loadListeners();

    this.emit(SmokerEvent.SmokeBegin, {
      plugins: this.pluginRegistry.plugins,
      opts: this.opts,
    });

    let packError: PackError | undefined;
    let installError: InstallError | undefined;
    let pkgManagerInstallManifests: PkgManagerInstallManifest[] | undefined;
    let installResults: InstallResult[];

    // PACK
    try {
      pkgManagerInstallManifests = await this.pack();
    } catch (err) {
      packError = err as PackError;
      return {error: packError};
    }

    // INSTALL
    try {
      installResults = await this.install(pkgManagerInstallManifests);
    } catch (err) {
      installError = err as InstallError;
      return {error: installError};
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
    } catch (e) {
      const err = e as Error;
      this.emit(SmokerEvent.UnknownError, err);
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
        if (this.enableChecks) {
          ruleResults = await this.runChecks(installResults);
        }

        // RUN SCRIPTS
        if (this.scripts.length) {
          runScriptResults = await this.runScripts(installResults);
        }
      }

      return await this.postRun(setupResult, ruleResults, runScriptResults);
    } catch (e) {
      const err = e as Error;
      this.emit(SmokerEvent.UnknownError, err);
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
   * 1. Built-in plugins must {@link PluginRegistry.loadPlugins be loaded}
   * 2. External plugins then must be loaded.
   * 3. The registry should refuse further registrations.
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
    registry = PluginRegistry.create(),
  ) {
    const plugins = castArray(opts.plugin).filter(
      (requested) => !isBlessedPlugin(requested),
    );
    debug('Requested external plugins: %O', plugins);
    // this must be done in sequence to protect the blessed plugins
    await registry.loadPlugins(BLESSED_PLUGINS);
    await registry.loadPlugins(plugins);
    // disable new registrations
    registry.close();

    debug('Loaded %d plugin(s)', registry.plugins.length);

    return {
      pluginRegistry: registry,
      options: OptionParser.create(registry).parse(opts),
    };
  }
}
