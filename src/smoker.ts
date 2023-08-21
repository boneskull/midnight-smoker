/* eslint-disable no-labels */
import {yellow} from 'chalk';
import createDebug from 'debug';
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import StrictEventEmitter from 'strict-event-emitter-types';
import {z} from 'zod';
import {SmokerError} from './error';
import {Events, type InstallEventData, type SmokerEvents} from './events';
import {
  loadPackageManagers,
  type InstallResults,
  type PackageManager,
} from './pm';
import {
  CheckContext,
  DEFAULT_RULE_CONFIG,
  RuleConfigSchema,
  type RawRuleConfig,
  type RuleConfig,
  type RuleCont,
  type StaticCheckContext,
} from './rules';
import {BuiltinRuleConts} from './rules/builtin';
import {
  type CheckFailure,
  type CheckOk,
  type CheckResults,
} from './rules/result';
import type {
  InstallManifest,
  PkgInstallManifest,
  PkgRunManifest,
  RunManifest,
  RunScriptResult,
  SmokeOptions,
  SmokeResults,
  SmokerOptions,
} from './types';
import {normalizeStringArray, readPackageJson} from './util';

const debug = createDebug('midnight-smoker:smoker');

export const TMP_DIR_PREFIX = 'midnight-smoker-';

type TSmokerEmitter = StrictEventEmitter<EventEmitter, SmokerEvents>;

function createStrictEventEmitterClass() {
  const TypedEmitter: {new (): TSmokerEmitter} = EventEmitter as any;
  return TypedEmitter;
}

const {
  SMOKE_BEGIN,
  SMOKE_OK,
  SMOKE_FAILED,
  PACK_BEGIN,
  PACK_FAILED,
  PACK_OK,
  INSTALL_BEGIN,
  INSTALL_FAILED,
  INSTALL_OK,
  RUN_SCRIPTS_BEGIN,
  RUN_SCRIPTS_FAILED,
  RUN_SCRIPTS_OK,
  RUN_SCRIPT_BEGIN,
  RUN_SCRIPT_FAILED,
  RUN_SCRIPT_OK,
  LINGERED,
  RUN_CHECKS_BEGIN,
  RUN_CHECKS_FAILED,
  RUN_CHECKS_OK,
  RUN_CHECK_BEGIN,
  RUN_CHECK_FAILED,
  RUN_CHECK_OK,
} = Events;

export class Smoker extends createStrictEventEmitterClass() {
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
   * Mapping of {@linkcode PackageManager} instances to their identifiers of the form `<npm|yarn|pnpm>@<version>`
   */
  private readonly pmIds: WeakMap<PackageManager, string>;
  /**
   * List of temp directories created
   */
  private readonly tempDirs: Set<string>;
  /**
   * List of specific workspaces to run against
   */
  private readonly workspaces: string[];

  public readonly ruleConfig: RuleConfig;
  /**
   * List of scripts to run in each workspace
   */
  public readonly scripts: string[];

  /**
   * Whether or not to run builtin checks
   */
  private readonly checks: boolean;

  private readonly originalOpts: SmokerOptions;

  constructor(
    public readonly pms: Map<string, PackageManager>,
    scripts: string | string[] = [],
    opts: SmokerOptions = {},
  ) {
    super();
    this.originalOpts = opts;
    this.scripts = normalizeStringArray(scripts);
    opts = {...opts};

    this.linger = Boolean(opts.linger);
    this.includeWorkspaceRoot = Boolean(opts.includeRoot);
    if (this.includeWorkspaceRoot) {
      opts.all = true;
    }
    this.add = normalizeStringArray(opts.add);
    this.bail = Boolean(opts.bail);
    this.allWorkspaces = Boolean(opts.all);
    this.workspaces = normalizeStringArray(opts.workspace);
    if (this.allWorkspaces && this.workspaces.length) {
      throw new SmokerError(
        'Option "workspace" is mutually exclusive with "all" and/or "includeRoot"',
      );
    }
    this.checks = opts.checks !== false;
    this.pmIds = new WeakMap();
    for (const [pmId, pm] of pms) {
      this.pmIds.set(pm, pmId);
    }
    this.tempDirs = new Set();
    this.ruleConfig = RuleConfigSchema.parse({
      ...DEFAULT_RULE_CONFIG,
      ...opts.rules,
    });
  }

  public static async init(
    scripts: string | string[] = [],
    opts: SmokeOptions = {},
  ) {
    const {pm, verbose, loose, all} = opts;

    const pms = await loadPackageManagers(pm, {
      verbose,
      loose: all && loose,
    });

    return new Smoker(pms, scripts, opts);
  }

  /**
   * Run the smoke test scripts!
   * @param scripts - One or more npm scripts to run
   * @param opts - Options
   */
  public static async smoke(
    scripts: string | string[] = [],
    opts: SmokeOptions = {},
  ): Promise<SmokeResults> {
    const smoker = await Smoker.init(scripts, opts);
    return smoker.smoke();
  }

  /**
   * Cleans up any temp directories created by {@linkcode createTempDir}.
   *
   * If the {@linkcode SmokeOptions.linger} option is set to `true`, this method
   * will _not_ clean up the directories, but will instead emit a
   * {@linkcode SmokerEvents.Lingered|Lingered} event.
   */
  public async cleanup(): Promise<void> {
    if (!this.linger) {
      await Promise.all(
        [...this.tempDirs].map(async (tempdir) => {
          try {
            await fs.rm(tempdir, {recursive: true, force: true});
          } catch (e) {
            const err = e as NodeJS.ErrnoException;
            if (err.code !== 'ENOENT') {
              throw new SmokerError(
                `Failed to clean temp directory ${tempdir}: ${e}`,
              );
            }
          } finally {
            this.tempDirs.delete(tempdir);
          }
        }),
      );
    } else if (this.tempDirs.size) {
      await Promise.resolve();
      this.emit(LINGERED, [...this.tempDirs]);
    }
  }

  /**
   * Creates a temp dir and adds it to the set of temp dirs to be cleaned up later
   * @returns New temp dir path
   */
  public async createTempDir(): Promise<string> {
    // TODO EMIT
    try {
      const prefix = path.join(tmpdir(), TMP_DIR_PREFIX);
      const tempdir = await fs.mkdtemp(prefix);
      this.tempDirs.add(tempdir);
      return tempdir;
    } catch (err) {
      throw new SmokerError(`Failed to create temporary directory: ${err}`);
    }
  }

  /**
   * Installs from tarball in a temp dir
   */
  public async install(manifests: PkgInstallManifest): Promise<InstallResults> {
    if (!manifests?.size) {
      throw new TypeError(
        '(install) Non-empty "pkgInstallManifest" arg is required',
      );
    }

    // ensure we emit asynchronously
    await Promise.resolve();

    const installData = this.buildInstallEventData(manifests);
    this.emit(INSTALL_BEGIN, installData);

    const installResults: InstallResults = new Map();
    for (const [pm, manifest] of manifests) {
      try {
        const manifestWithAdds = {
          ...manifest,
          additionalDeps: this.add ?? [],
        };
        debug(
          'Installing package(s) %O using %s',
          [
            ...manifestWithAdds.packedPkgs.map((p) => p.pkgName),
            ...manifestWithAdds.additionalDeps,
          ],
          this.pmIds.get(pm),
        );
        const result = await pm.install(manifestWithAdds);
        installResults.set(pm, [manifest, result]);
      } catch (err) {
        const error = err as SmokerError;
        this.emit(INSTALL_FAILED, error);
        throw error;
      }
    }

    this.emit(INSTALL_OK, installData);

    return installResults;
  }

  /**
   * For each package manager, creates a tarball for one or more packages
   */
  public async pack(): Promise<PkgInstallManifest> {
    await Promise.resolve();

    this.emit(PACK_BEGIN, {packageManagers: [...this.pms.keys()]});

    const manifestMap: PkgInstallManifest = new Map();

    for await (const pm of this.pms.values()) {
      const dest = await this.createTempDir();

      let manifest: InstallManifest;
      try {
        debug('Packing into %s using %s', dest, this.pmIds.get(pm));
        manifest = await pm.pack(dest, {
          allWorkspaces: this.allWorkspaces,
          includeWorkspaceRoot: this.includeWorkspaceRoot,
          workspaces: this.workspaces,
        });
        manifestMap.set(pm, manifest);
      } catch (err) {
        this.emit(PACK_FAILED, err as SmokerError);
        throw err;
      }
    }
    this.emit(PACK_OK, this.buildInstallEventData(manifestMap));
    return manifestMap;
  }

  /**
   * @internal
   * @param ruleCont - Rule continuation
   * @param pkgPath - Path to installed package
   * @param config - Parsed rule config
   * @returns Results of a single check
   */
  public async runCheck(
    ruleCont: RuleCont,
    pkgPath: string,
    config: RawRuleConfig,
  ): Promise<CheckResults> {
    return ruleCont(async (rule) => {
      let {name: ruleName, defaultSeverity: severity, schema} = rule;
      const configForRule = config[ruleName as keyof typeof config];

      let opts: z.infer<typeof schema> | undefined;
      if (typeof configForRule === 'string') {
        severity = configForRule;
      } else if (Array.isArray(configForRule)) {
        opts = configForRule[0];
        severity = (configForRule[1] as typeof severity) ?? severity;
      } else {
        opts = configForRule;
      }

      const {packageJson: pkgJson, path: pkgJsonPath} = await readPackageJson({
        cwd: pkgPath,
        strict: true,
      });

      const staticCtx: StaticCheckContext = {
        pkgJson,
        pkgJsonPath,
        pkgPath,
        severity,
      };

      debug(`Running rule %s with context %O`, ruleName, staticCtx);
      const context = new CheckContext(rule, staticCtx);

      let result: CheckFailure[] | undefined;
      try {
        result = await rule.check(context, opts);
      } catch (err) {
        console.error(yellow(`Warning: error running rule ${ruleName}:`));
        console.error(err);
      }

      if (result?.length) {
        return {
          failed: result,
          passed: [],
        };
      }
      const ok: CheckOk = {
        rule,
        context,
        failed: false,
      };
      return {failed: [], passed: [ok]};
    });
  }

  public async runChecks(
    installResults: InstallResults,
  ): Promise<CheckResults> {
    const allFailed: CheckFailure[] = [];
    const allPassed: CheckOk[] = [];
    const {ruleConfig} = this;
    await Promise.resolve();

    const runnableRules = BuiltinRuleConts.filter((ruleCont) =>
      ruleCont((rule) => ruleConfig.isRuleEnabled(rule.name)),
    );

    const total = runnableRules.length;
    let current = 0;

    this.emit(RUN_CHECKS_BEGIN, {config: ruleConfig, total});

    // run against multiple package managers??
    for (const ruleCont of runnableRules) {
      const ruleName = ruleCont((rule) => rule.name);
      const configForRule = ruleConfig[ruleName as keyof RawRuleConfig];
      this.emit(RUN_CHECK_BEGIN, {
        rule: ruleName,
        config: configForRule,
        current,
        total,
      });

      for (const [{packedPkgs}] of installResults.values()) {
        for (const {installPath: pkgPath} of packedPkgs) {
          const {failed, passed} = await this.runCheck(
            ruleCont,
            pkgPath,
            ruleConfig,
          );
          if (failed.length) {
            this.emit(RUN_CHECK_FAILED, {
              rule: ruleName,
              config: configForRule,
              current,
              total,
              failed,
            });
          } else {
            this.emit(RUN_CHECK_OK, {
              rule: ruleName,
              config: configForRule,
              current,
              total,
            });
          }

          allFailed.push(...failed);
          allPassed.push(...passed);

          current++;
        }
      }
    }

    const evtData = {
      config: ruleConfig,
      total,
      passed: allPassed,
      failed: allFailed,
    };

    if (allFailed.length) {
      this.emit(RUN_CHECKS_FAILED, evtData);
    } else {
      this.emit(RUN_CHECKS_OK, evtData);
    }

    return {failed: allFailed, passed: allPassed};
  }

  /**
   * Runs the script for each package in `packItems`
   */
  public async runScripts(
    pkgRunManifest: PkgRunManifest,
  ): Promise<RunScriptResult[]> {
    if (!pkgRunManifest) {
      throw new TypeError('(runScripts) "pkgRunManifest" arg is required');
    }

    const pkgRunManifestForEmit: Record<string, RunManifest[]> = {};
    for (const [pm, runManifests] of pkgRunManifest) {
      const pmId = this.pmIds.get(pm);
      if (!pmId) {
        /* istanbul ignore next */
        throw new SmokerError(
          'Could not find package manager ID; please report this bug',
        );
      }
      pkgRunManifestForEmit[pmId] = [...runManifests];
    }

    const totalScripts = [...pkgRunManifest].reduce(
      (count, [, runManifests]) => count + runManifests.size,
      0,
    );

    await Promise.resolve();
    this.emit(RUN_SCRIPTS_BEGIN, {
      manifest: pkgRunManifestForEmit,
      total: totalScripts,
    });

    const {bail} = this;
    let current = 0;
    const scripts: string[] = [];
    const results: RunScriptResult[] = [];

    BAIL: for await (const [pm, runManifests] of pkgRunManifest) {
      const pmId = this.pmIds.get(pm);

      if (!pmId) {
        /* istanbul ignore next */
        throw new SmokerError(
          'Could not find package manager ID; please report this bug',
        );
      }
      for await (const runManifest of runManifests) {
        let result: RunScriptResult;
        const {script} = runManifest;
        const {pkgName} = runManifest.packedPkg;
        scripts.push(script);
        this.emit(RUN_SCRIPT_BEGIN, {
          script,
          pkgName,
          total: totalScripts,
          current,
        });
        try {
          result = await pm.runScript(runManifest);
          results.push(result);
          if (result.error) {
            debug(
              'Script "%s" failed in package "%s": %O',
              script,
              pkgName,
              result,
            );
            this.emit(RUN_SCRIPT_FAILED, {
              ...result,
              script,
              error: result.error,
              current: current++,
              total: totalScripts,
            });

            if (bail) {
              break BAIL;
            }
          } else {
            this.emit(RUN_SCRIPT_OK, {
              ...result,
              script,
              current,
              total: totalScripts,
            });
          }
        } catch (err) {
          throw new SmokerError(
            `(runScripts): Unknown failure from "${pmId}" plugin: ${err}`,
          );
        }
      }
    }

    const failed = results.filter((result) => result.error).length;
    const passed = results.length - failed;

    this.emit(failed ? RUN_SCRIPTS_FAILED : RUN_SCRIPTS_OK, {
      results,
      manifest: pkgRunManifestForEmit,
      total: totalScripts,
      failed,
      passed,
    });

    return results;
  }

  /**
   * Converts install results to a {@linkcode PkgRunManifest} for {@linkcode runScripts}
   * @param installResults Results of {@linkcode install}
   * @returns Package managers and scripts to run for each unpacked package
   */
  private buildPkgRunManifest(installResults: InstallResults): PkgRunManifest {
    const pkgRunManifest: PkgRunManifest = new Map();
    for (const [pm, [{packedPkgs}]] of installResults) {
      const runManifests: Set<RunManifest> = new Set();
      for (const packedPkg of packedPkgs) {
        for (const script of this.scripts) {
          runManifests.add({
            script,
            packedPkg,
          });
        }
      }
      pkgRunManifest.set(pm, runManifests);
    }
    return pkgRunManifest;
  }

  /**
   * Returns `true` if any of the scripts failed or any of the checks failed
   * @param results Results from {@linkcode smoke}
   * @returns Whether the results indicate a failure
   */
  public isSmokeFailure({scripts, checks}: SmokeResults) {
    return checks.failed.length || scripts.some((r) => r.error);
  }

  /**
   * Pack, install, run checks (optionally), and run scripts (optionally)
   * @returns Results
   */
  public async smoke(): Promise<SmokeResults> {
    // do not emit synchronously
    await Promise.resolve();
    this.emit(SMOKE_BEGIN);

    try {
      // PACK
      const pkgInstallManifest = await this.pack();

      // INSTALL
      const installResults = await this.install(pkgInstallManifest);

      let ruleResults: CheckResults = {passed: [], failed: []};
      let runScriptResults: RunScriptResult[] = [];

      // RUN CHECKS
      if (this.checks) {
        ruleResults = await this.runChecks(installResults);
      }

      // RUN SCRIPTS
      if (this.scripts.length) {
        const pkgRunManifest = this.buildPkgRunManifest(installResults);
        runScriptResults = await this.runScripts(pkgRunManifest);
      }

      // END
      const smokeResults: SmokeResults = {
        scripts: runScriptResults,
        checks: ruleResults,
        opts: this.originalOpts,
      };

      if (this.isSmokeFailure(smokeResults)) {
        this.emit(SMOKE_FAILED, new SmokerError('🤮 Maurice!'));
      } else {
        this.emit(SMOKE_OK, smokeResults);
      }

      return smokeResults;
    } catch (err) {
      this.emit(SMOKE_FAILED, err as SmokerError);
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * This is only here because it's a fair amount of work to mash the data into a format more suitable for display.
   *
   * This is used by the events {@linkcode SmokerEvents.InstallBegin}, {@linkcode SmokerEvents.InstallOk}, and {@linkcode SmokerEvents.PackOk}.
   * @param pkgInstallManifest What to install and with what package manager
   * @returns Something to be emitted
   */
  private buildInstallEventData(
    pkgInstallManifest: PkgInstallManifest,
  ): InstallEventData {
    const uniquePkgs = new Set<string>();
    const pmIds = new Set<string>();
    const manifests: InstallManifest[] = [];
    const additionalDeps = new Set<string>();
    for (const [pm, manifest] of pkgInstallManifest) {
      const id = this.pmIds.get(pm);
      if (!id) {
        /* istanbul ignore next */
        throw new SmokerError(
          'Could not find package manager ID; please report this bug',
        );
      }
      pmIds.add(id);
      manifests.push(manifest);
      for (const {pkgName} of manifest.packedPkgs) {
        uniquePkgs.add(pkgName);
      }
      if (manifest.additionalDeps) {
        for (const dep of manifest.additionalDeps) {
          additionalDeps.add(dep);
        }
      }
    }

    return {
      uniquePkgs: [...uniquePkgs],
      packageManagers: [...pmIds],
      additionalDeps: [...additionalDeps],
      manifests,
    };
  }
}
