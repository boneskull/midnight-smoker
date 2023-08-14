/* eslint-disable no-labels */
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import StrictEventEmitter from 'strict-event-emitter-types';
import {SmokerError} from './error';
import {Events, type SmokerEvents} from './events';
import {loadPackageManagers, type PackageManager} from './pm';
import type {
  InstallEventData,
  InstallManifest,
  PkgInstallManifest,
  PkgRunManifest,
  RunManifest,
  RunScriptResult,
  SmokeOptions,
  SmokerOptions,
} from './types';
import {normalizeStringArray} from './util';

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

  /**
   * List of scripts to run in each workspace
   */
  public readonly scripts: string[];

  constructor(
    scripts: string | string[],
    public readonly pms: Map<string, PackageManager>,
    opts: SmokerOptions = {},
  ) {
    super();
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

    this.pmIds = new WeakMap();
    for (const [pmId, pm] of pms) {
      this.pmIds.set(pm, pmId);
    }
    this.tempDirs = new Set();
  }

  public static async init(
    scripts: string | string[],
    opts: SmokeOptions = {},
  ) {
    const pms = await loadPackageManagers(opts.pm, {verbose: opts.verbose});
    return new Smoker(scripts, pms, opts);
  }

  /**
   * Run the smoke test scripts!
   * @param scripts - One or more npm scripts to run
   * @param opts - Options
   */
  public static async smoke(
    scripts: string | string[],
    opts: SmokeOptions = {},
  ): Promise<RunScriptResult[]> {
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
  public async install(manifests: PkgInstallManifest): Promise<PkgRunManifest> {
    if (!manifests?.size) {
      throw new TypeError(
        '(install) Non-empty "pkgInstallManifest" arg is required',
      );
    }

    // ensure we emit asynchronously
    await Promise.resolve();

    const installData = this.buildEventData(manifests);
    this.emit(INSTALL_BEGIN, installData);

    const pkgRunManifest: PkgRunManifest = new Map();

    for (const [pm, manifest] of manifests) {
      try {
        // TODO check for errors?
        await pm.install({...manifest, additionalDeps: this.add});
        const runManifests: Set<RunManifest> = new Set();
        for (const packedPkg of manifest.packedPkgs) {
          for (const script of this.scripts) {
            runManifests.add({packedPkg, script});
          }
        }
        pkgRunManifest.set(pm, runManifests);
      } catch (err) {
        const error = err as SmokerError;
        this.emit(INSTALL_FAILED, error);
        throw error;
      }
    }

    this.emit(INSTALL_OK, installData);

    return pkgRunManifest;
  }

  /**
   * For each package manager, creates a tarball for one or more packages
   */
  public async pack(): Promise<PkgInstallManifest> {
    await Promise.resolve();
    this.emit(PACK_BEGIN);

    const manifestMap: PkgInstallManifest = new Map();

    for await (const pm of this.pms.values()) {
      const dest = await this.createTempDir();

      let manifest: InstallManifest;
      try {
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
    this.emit(PACK_OK, this.buildEventData(manifestMap));
    return manifestMap;
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
        scripts.push(script);
        this.emit(RUN_SCRIPT_BEGIN, {
          script,
          pkgName: runManifest.packedPkg.pkgName,
          total: totalScripts,
          current,
        });
        try {
          result = await pm.runScript(runManifest);
          results.push(result);
          if (result.error) {
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

    const failureCount = results.filter((result) => result.error).length;

    if (failureCount) {
      this.emit(RUN_SCRIPTS_FAILED, {
        results,
        manifest: pkgRunManifestForEmit,
        total: totalScripts,
        failures: failureCount,
        executed: results.length,
      });
    } else {
      this.emit(RUN_SCRIPTS_OK, {
        failures: 0,
        results,
        manifest: pkgRunManifestForEmit,
        total: totalScripts,
        executed: results.length,
      });
    }
    return results;
  }

  public async smoke(): Promise<RunScriptResult[]> {
    // do not emit synchronously
    await Promise.resolve();
    this.emit(SMOKE_BEGIN);

    try {
      const pkgInstallManifest = await this.pack();
      const pkgRunManifest = await this.install(pkgInstallManifest);
      const results = await this.runScripts(pkgRunManifest);
      if (!results.some((result) => result.error)) {
        this.emit(SMOKE_OK);
      } else {
        this.emit(SMOKE_FAILED, new SmokerError('🤮 Maurice!'));
      }
      return results;
    } catch (err) {
      this.emit(SMOKE_FAILED, err as Error);
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
  private buildEventData(
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
