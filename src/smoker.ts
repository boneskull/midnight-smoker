/* eslint-disable no-labels */
import createDebug from 'debug';
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import StrictEventEmitter from 'strict-event-emitter-types';
import {
  DirCreationError,
  DirDeletionError,
  FatalError,
  InvalidArgError,
  PackageManagerError,
  PackageManagerIdError,
  RuleError,
  SmokeFailedError,
  type InstallError,
  type PackError,
} from './error';
import {Event, type InstallEventData, type SmokerEvent} from './event';
import {
  parseOptions,
  type RawSmokerOptions,
  type SmokerOptions,
} from './options';
import {
  loadPackageManagers,
  type InstallResults,
  type PackageManager,
} from './pm';
import {
  CheckContext,
  CheckSeverities,
  type CheckOptions,
  type RuleCont,
  type StaticCheckContext,
  RuleOptions,
} from './rules';
import {BuiltinRuleConts} from './rules/builtin';
import {
  type CheckFailure,
  type CheckOk,
  type CheckResults,
} from './rules/result';
import {
  type InstallManifest,
  type PkgInstallManifest,
  type PkgRunManifest,
  type RunManifest,
  type RunScriptResult,
  type SmokeResults,
} from './types';
import {readPackageJson} from './util';

const debug = createDebug('midnight-smoker:smoker');

export const TMP_DIR_PREFIX = 'midnight-smoker-';

type TSmokerEmitter = StrictEventEmitter<EventEmitter, SmokerEvent>;

function createStrictEventEmitterClass() {
  const TypedEmitter: {new (): TSmokerEmitter} = EventEmitter as any;
  return TypedEmitter;
}

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

  public readonly ruleConfig: CheckOptions;
  /**
   * List of scripts to run in each workspace
   */
  public readonly scripts: string[];

  /**
   * Whether or not to run builtin checks
   */
  private readonly checks: boolean;

  private readonly originalOpts: SmokerOptions;

  private constructor(
    public readonly pms: Map<string, PackageManager>,
    opts: SmokerOptions,
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
      checks,
      rules,
    } = opts;
    this.originalOpts = Object.freeze(opts);

    this.scripts = script;
    this.linger = linger;
    this.includeWorkspaceRoot = includeRoot;
    this.add = add;
    this.bail = bail;
    this.allWorkspaces = all;
    this.workspaces = workspace;
    this.checks = checks;
    this.ruleConfig = rules;

    if (this.allWorkspaces && this.workspaces.length) {
      throw new InvalidArgError(
        'Option "workspace" is mutually exclusive with "all" and/or "includeRoot"',
      );
    }

    this.pmIds = new WeakMap();
    for (const [pmId, pm] of pms) {
      this.pmIds.set(pm, pmId);
    }
    this.tempDirs = new Set();
  }

  public static async init(opts: RawSmokerOptions = {}) {
    const smokerOpts = parseOptions(opts);
    const {verbose, pm, loose} = smokerOpts;
    const pms = await loadPackageManagers(pm, {
      verbose,
      loose,
    });

    return Smoker.create(pms, smokerOpts);
  }

  public static create(
    pms: Map<string, PackageManager>,
    opts: RawSmokerOptions | SmokerOptions = {},
  ) {
    return new Smoker(pms, parseOptions(opts));
  }

  /**
   * Run the smoke test scripts!
   * @param opts - Options
   */
  public static async smoke(
    opts: RawSmokerOptions = {},
  ): Promise<SmokeResults> {
    const smoker = await Smoker.init(opts);
    return smoker.smoke();
  }

  /**
   * Cleans up any temp directories created by {@linkcode createTempDir}.
   *
   * If the {@linkcode SmokeOptions.linger} option is set to `true`, this method
   * will _not_ clean up the directories, but will instead emit a
   * {@linkcode SmokerEvent.Lingered|Lingered} event.
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
              throw new DirDeletionError(
                `Failed to clean temp directory ${tempdir}`,
                tempdir,
                err,
              );
            }
          } finally {
            this.tempDirs.delete(tempdir);
          }
        }),
      );
    } else if (this.tempDirs.size) {
      await Promise.resolve();
      this.emit(Event.LINGERED, [...this.tempDirs]);
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
      throw new DirCreationError(
        'Failed to create temp directory',
        err as NodeJS.ErrnoException,
      );
    }
  }

  /**
   * Installs from tarball in a temp dir
   */
  public async install(manifests: PkgInstallManifest): Promise<InstallResults> {
    if (!manifests?.size) {
      throw new InvalidArgError(
        'Non-empty "manifests" arg is required',
        'manifests',
      );
    }

    // ensure we emit asynchronously
    await Promise.resolve();

    const installData = this.buildInstallEventData(manifests);
    this.emit(Event.INSTALL_BEGIN, installData);

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
        const error = err as InstallError;
        this.emit(Event.INSTALL_FAILED, error);
        throw error;
      }
    }

    this.emit(Event.INSTALL_OK, installData);

    return installResults;
  }

  /**
   * For each package manager, creates a tarball for one or more packages
   */
  public async pack(): Promise<PkgInstallManifest> {
    await Promise.resolve();

    this.emit(Event.PACK_BEGIN, {packageManagers: [...this.pms.keys()]});

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
        this.emit(Event.PACK_FAILED, err as PackError);
        throw err;
      }
    }
    this.emit(Event.PACK_OK, this.buildInstallEventData(manifestMap));
    return manifestMap;
  }

  /**
   * @internal
   * @param ruleCont - Rule continuation
   * @param pkgPath - Path to installed package
   * @param checkOpts - Parsed rule options
   * @returns Results of a single check
   */
  public async runCheck(
    ruleCont: RuleCont,
    pkgPath: string,
    checkOpts: CheckOptions,
  ): Promise<CheckResults> {
    return ruleCont(async (rule) => {
      const {name: ruleName} = rule;
      const ruleOpts: RuleOptions<typeof rule.schema> =
        checkOpts[ruleName as keyof CheckOptions];
      const {severity, opts} = ruleOpts;

      // XXX might be something better to do here. this won't happen during
      // expected non-test operation
      /* istanbul ignore next */
      if (severity === CheckSeverities.OFF) {
        return {failed: [], passed: []};
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

      debug(
        `Running rule %s with context %O and opts %O`,
        ruleName,
        {
          pkgJsonPath,
          pkgPath,
          severity,
          pkgName: pkgJson.name,
        },
        opts,
      );
      const context = new CheckContext(rule, staticCtx);

      let result: CheckFailure[] | undefined;
      try {
        result = await rule.check(context, opts);
      } catch (err) {
        this.emit(
          Event.RULE_ERROR,
          new RuleError(
            `Rule "${ruleName}" threw an exception`,
            staticCtx,
            ruleName,
            err as Error,
          ),
        );
        return {
          failed: [
            {
              message: String(err),
              failed: true,
              severity,
              rule,
              context: staticCtx,
            },
          ],
          passed: [],
        };
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
      ruleCont(
        (rule) =>
          ruleConfig[rule.name as keyof typeof ruleConfig].severity !==
          CheckSeverities.OFF,
      ),
    );

    const total = runnableRules.length;
    let current = 0;

    this.emit(Event.RUN_CHECKS_BEGIN, {config: ruleConfig, total});

    // run against multiple package managers??
    for (const ruleCont of runnableRules) {
      const ruleName = ruleCont((rule) => rule.name);
      const configForRule = ruleConfig[ruleName as keyof typeof ruleConfig];
      this.emit(Event.RUN_CHECK_BEGIN, {
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
            this.emit(Event.RUN_CHECK_FAILED, {
              rule: ruleName,
              config: configForRule,
              current,
              total,
              failed,
            });
          } else {
            this.emit(Event.RUN_CHECK_OK, {
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
      this.emit(Event.RUN_CHECKS_FAILED, evtData);
    } else {
      this.emit(Event.RUN_CHECKS_OK, evtData);
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
        throw new PackageManagerIdError();
      }
      pkgRunManifestForEmit[pmId] = [...runManifests];
    }

    const totalScripts = [...pkgRunManifest].reduce(
      (count, [, runManifests]) => count + runManifests.size,
      0,
    );

    await Promise.resolve();
    this.emit(Event.RUN_SCRIPTS_BEGIN, {
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
        throw new PackageManagerIdError();
      }
      for await (const runManifest of runManifests) {
        let result: RunScriptResult;
        const {script} = runManifest;
        const {pkgName} = runManifest.packedPkg;
        scripts.push(script);
        this.emit(Event.RUN_SCRIPT_BEGIN, {
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
            this.emit(Event.RUN_SCRIPT_FAILED, {
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
            this.emit(Event.RUN_SCRIPT_OK, {
              ...result,
              script,
              current,
              total: totalScripts,
            });
          }
        } catch (err) {
          throw new PackageManagerError(
            `Package manager "${pmId}" failed to run script "${script}`,
            pmId,
            err as Error,
          );
        }
      }
    }

    const failed = results.filter((result) => result.error).length;
    const passed = results.length - failed;

    this.emit(failed ? Event.RUN_SCRIPTS_FAILED : Event.RUN_SCRIPTS_OK, {
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
  public isSmokeFailure({scripts, checks}: SmokeResults): boolean {
    return (
      checks.failed.some(
        (checkFailure) => checkFailure.severity === CheckSeverities.ERROR,
      ) || scripts.some((runScriptResult) => runScriptResult.error)
    );
  }

  /**
   * Pack, install, run checks (optionally), and run scripts (optionally)
   * @returns Results
   */
  public async smoke(): Promise<SmokeResults> {
    // do not emit synchronously
    await Promise.resolve();
    this.emit(Event.SMOKE_BEGIN);

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
        this.emit(
          Event.SMOKE_FAILED,
          new SmokeFailedError('🤮 Maurice!', {results: smokeResults}),
        );
      } else {
        this.emit(Event.SMOKE_OK, smokeResults);
      }

      return smokeResults;
    } catch (err) {
      throw new FatalError('midnight-smoker failed unexpectedly', err as Error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * This is only here because it's a fair amount of work to mash the data into a format more suitable for display.
   *
   * This is used by the events {@linkcode SmokerEvent.InstallBegin}, {@linkcode SmokerEvent.InstallOk}, and {@linkcode SmokerEvent.PackOk}.
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
        throw new PackageManagerIdError();
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
