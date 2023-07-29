/* eslint-disable no-labels */
import createDebug from 'debug';
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import StrictEventEmitter from 'strict-event-emitter-types';
import {SmokerError} from './error';
import {Npm, type PackageManager} from './pm';
import type {
  Events,
  InstallManifest,
  PackedPackage,
  RunScriptResult,
  SmokerOptions,
} from './types';

const debug = createDebug('midnight-smoker');

export const TMP_DIR_PREFIX = 'midnight-smoker-';

type TSmokerEmitter = StrictEventEmitter<EventEmitter, Events>;

/**
 * Trims all strings in an array and removes empty strings.
 * Returns empty array if input is falsy.
 */
function normalizeArray(array?: string[]): string[] {
  return array ? array.map((item) => item.trim()).filter(Boolean) : [];
}

function createStrictEventEmitterClass() {
  const TypedEmitter: {new (): TSmokerEmitter} = EventEmitter as any;
  return TypedEmitter;
}

export const events = {
  SMOKE_BEGIN: 'SmokeBegin',
  SMOKE_OK: 'SmokeOk',
  SMOKE_FAILED: 'SmokeFailed',
  PACK_BEGIN: 'PackBegin',
  PACK_FAILED: 'PackFailed',
  PACK_OK: 'PackOk',
  INSTALL_BEGIN: 'InstallBegin',
  INSTALL_FAILED: 'InstallFailed',
  INSTALL_OK: 'InstallOk',
  RUN_SCRIPTS_BEGIN: 'RunScriptsBegin',
  RUN_SCRIPTS_FAILED: 'RunScriptsFailed',
  RUN_SCRIPTS_OK: 'RunScriptsOk',
  RUN_SCRIPT_BEGIN: 'RunScriptBegin',
  RUN_SCRIPT_FAILED: 'RunScriptFailed',
  RUN_SCRIPT_OK: 'RunScriptOk',
} as const;

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
} = events;

export class Smoker extends createStrictEventEmitterClass() {
  private readonly allWorkspaces: boolean;
  private readonly bail: boolean;
  private readonly clean: boolean;
  private readonly extraArgs: string[];
  private readonly force: boolean;
  private readonly includeWorkspaceRoot;
  private readonly linger: boolean;
  private readonly verbose: boolean;
  private readonly workspaces: string[];

  private cwd?: string;

  public readonly opts: Readonly<SmokerOptions>;
  public readonly scripts: string[];

  constructor(
    scripts: string | string[],
    public readonly pm: PackageManager,
    opts: SmokerOptions = {},
  ) {
    super();
    if (typeof scripts === 'string') {
      scripts = [scripts];
    }
    this.scripts = normalizeArray(scripts);
    opts = {...opts};

    this.linger = Boolean(opts.linger);
    this.force = Boolean(opts.force);
    this.clean = Boolean(opts.clean);
    this.verbose = Boolean(opts.verbose);
    this.includeWorkspaceRoot = Boolean(opts.includeRoot);
    if (this.includeWorkspaceRoot) {
      opts.all = true;
    }
    this.bail = Boolean(opts.bail);
    this.allWorkspaces = Boolean(opts.all);
    this.workspaces = normalizeArray(opts.workspace);
    if (this.allWorkspaces && this.workspaces.length) {
      throw new SmokerError(
        'Option "workspace" is mutually exclusive with "all" and/or "includeRoot"',
      );
    }
    this.extraArgs = normalizeArray(opts.installArgs);
    this.opts = Object.freeze(opts);
  }

  /**
   * Run the smoke test scripts!
   * @param scripts - One or more npm scripts to run
   * @param opts - Options
   */
  public static async smoke(
    scripts: string | string[],
    opts: SmokerOptions = {},
  ): Promise<RunScriptResult[]> {
    const smoker = Smoker.withNpm(scripts, opts);
    return smoker.smoke();
  }

  public static withNpm(scripts: string | string[], opts: SmokerOptions = {}) {
    return new Smoker(
      scripts,
      new Npm({binPath: opts.npm, verbose: opts.verbose}),
      opts,
    );
  }

  /**
   * Cleans up; called by {@linkcode Smoker.smoke}.
   */
  public async cleanup() {
    if (this.cwd) {
      return this.cleanWorkingDir(this.cwd);
    }
  }

  public async createWorkingDirectory(): Promise<string> {
    // TODO EMIT
    if (this.cwd) {
      return this.cwd;
    }
    let wd = this.opts.dir;
    if (wd) {
      if (this.force && this.clean) {
        await this.cleanWorkingDir(wd);
      } else if (!this.force) {
        await this.assertNoWorkingDir(wd);
      }
      try {
        await fs.mkdir(wd, {recursive: true});
      } catch (err) {
        throw new Error(`Failed to create working directory ${wd}: ${err}`);
      }
    } else {
      wd = await this.createWorkingDir();
    }

    this.cwd = wd;

    debug('(createWorkingDirectory) Using working directory %s', wd);

    return wd;
  }

  /**
   * Installs from tarball in a temp dir
   */
  public async install(manifest: InstallManifest): Promise<void> {
    if (!manifest) {
      throw new TypeError('(install) "manifest" arg is required');
    }

    const pkgCount = manifest.packedPkgs.length;
    if (!pkgCount) {
      throw new TypeError(
        '(install) "manifest" arg must contain non-empty list of packed packages',
      );
    }

    // ensure we emit asynchronously
    await Promise.resolve();
    this.emit(INSTALL_BEGIN, manifest);
    const {extraArgs} = this;
    try {
      await this.pm.install(manifest, {extraArgs});
    } catch (err) {
      const error = err as SmokerError;
      this.emit(INSTALL_FAILED, error);
      throw error;
    }

    this.emit(INSTALL_OK, manifest);
    debug('(install) Installed %d packages', pkgCount);
  }

  /**
   * Creates a tarball for one or more packages
   */
  public async pack(): Promise<InstallManifest> {
    const dest = await this.createWorkingDir();
    this.emit(PACK_BEGIN);

    let manifest: InstallManifest;
    try {
      manifest = await this.pm.pack(dest, {
        allWorkspaces: this.allWorkspaces,
        includeWorkspaceRoot: this.includeWorkspaceRoot,
        workspaces: this.workspaces,
      });
    } catch (err) {
      this.emit(PACK_FAILED, err as SmokerError);
      throw err;
    }

    this.emit(PACK_OK, manifest);
    return manifest;
  }

  /**
   * Runs the script for each package in `packItems`
   */
  public async runScripts(
    packedPkgs: PackedPackage[],
  ): Promise<RunScriptResult[]> {
    if (!packedPkgs) {
      throw new TypeError('(runScripts) "packedPkgs" arg is required');
    }
    if (!packedPkgs.length) {
      debug('(runScripts) No packed items; no scripts to run');
      throw new TypeError('(runScripts) "packedPkgs" arg must not be empty');
    }

    const {scripts, bail} = this;
    const scriptCount = scripts.length;
    const total = packedPkgs.length * scriptCount;
    const results: RunScriptResult[] = [];

    await Promise.resolve();
    this.emit(RUN_SCRIPTS_BEGIN, {scripts, packedPkgs, total});

    BAIL: for await (const [scriptIdx, script] of Object.entries(scripts)) {
      for await (const [packedPkgIdx, packedPkg] of Object.entries(
        packedPkgs,
      )) {
        const current = Number(scriptIdx) + Number(packedPkgIdx);
        const {pkgName} = packedPkg;
        this.emit(RUN_SCRIPT_BEGIN, {script, pkgName, total, current});

        let result: RunScriptResult;
        try {
          result = await this.pm.runScript(packedPkg, script);
          if (result.error) {
            this.emit(RUN_SCRIPT_FAILED, {
              ...result,
              script,
              error: result.error,
              current,
              total,
            });
          } else {
            this.emit(RUN_SCRIPT_OK, {...result, script, current, total});
          }
          results.push(result);
        } catch (err) {
          throw new SmokerError(
            `(runScripts): Unknown failure from "${this.pm.name}" plugin: ${err}`,
          );
        }

        if (bail) {
          break BAIL;
        }
      }
    }

    const failureCount = results.filter((result) => result.error).length;

    if (failureCount) {
      this.emit(RUN_SCRIPTS_FAILED, {
        results,
        scripts,
        total,
        failures: failureCount,
        executed: results.length,
      });
    } else {
      this.emit(RUN_SCRIPTS_OK, {
        results,
        total,
        executed: results.length,
        scripts,
      });
    }
    return results;
  }

  public async smoke(): Promise<RunScriptResult[]> {
    // do not emit synchronously
    await Promise.resolve();
    this.emit(SMOKE_BEGIN);

    try {
      const manifest = await this.pack();
      debug('(smoke) Received %d packed packages', manifest.packedPkgs.length);
      await this.install(manifest);
      const results = await this.runScripts(manifest.packedPkgs);
      this.emit(SMOKE_OK);
      return results;
    } catch (err) {
      this.emit(SMOKE_FAILED, err as Error);
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  private async assertNoWorkingDir(wd: string): Promise<void> {
    // TODO EMIT
    try {
      await fs.stat(wd);
    } catch {
      return;
    }
    throw new Error(
      `Working directory ${wd} already exists. Use "force" option to proceed anyhow.`,
    );
  }

  private async cleanWorkingDir(wd: string): Promise<void> {
    if (!this.linger) {
      try {
        await fs.rm(wd, {recursive: true});
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code !== 'ENOENT') {
          throw new Error(`Failed to clean working directory ${wd}: ${e}`);
        }
      }
    }
  }

  private async createWorkingDir(): Promise<string> {
    // TODO EMIT
    try {
      const prefix = path.join(tmpdir(), TMP_DIR_PREFIX);
      return await fs.mkdtemp(prefix);
    } catch (err) {
      throw new Error(`Failed to create temporary working directory: ${err}`);
    }
  }
}
