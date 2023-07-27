import which from 'which';
import createDebug from 'debug';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import execa, {type ExecaError, type ExecaReturnValue} from 'execa';
import {EventEmitter} from 'node:events';
import type {
  NpmInfo,
  NpmPackItem,
  PackItem,
  RunScriptResult,
  SmokerOptions,
  TSmokerEmitter,
} from './types';

const debug = createDebug('midnight-smoker');

const TMP_DIR_PREFIX = 'midnight-smoker-';

export const events = {
  SMOKE_BEGIN: 'SmokeBegin',
  SMOKE_OK: 'SmokeOk',
  SMOKE_FAILED: 'SmokeFailed',
  FIND_NPM_BEGIN: 'FindNpmBegin',
  FIND_NPM_FAILED: 'FindNpmFailed',
  FIND_NPM_OK: 'FindNpmOk',
  PACK_BEGIN: 'PackBegin',
  PACK_FAILED: 'PackFailed',
  PACK_OK: 'PackOk',
  INSTALL_BEGIN: 'InstallBegin',
  INSTALL_FAILED: 'InstallFailed',
  INSTALL_OK: 'InstallOk',
  RUN_NPM_BEGIN: 'RunNpmBegin',
  RUN_NPM_OK: 'RunNpmOk',
  RUN_NPM_FAILED: 'RunNpmFailed',
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
  FIND_NPM_BEGIN,
  FIND_NPM_FAILED,
  FIND_NPM_OK,
  PACK_BEGIN,
  PACK_FAILED,
  PACK_OK,
  INSTALL_BEGIN,
  INSTALL_FAILED,
  INSTALL_OK,
  RUN_NPM_BEGIN,
  RUN_NPM_FAILED,
  RUN_NPM_OK,
  RUN_SCRIPTS_BEGIN,
  RUN_SCRIPTS_FAILED,
  RUN_SCRIPTS_OK,
  RUN_SCRIPT_BEGIN,
  RUN_SCRIPT_FAILED,
  RUN_SCRIPT_OK,
} = events;

/**
 * Trims all strings in an array and removes empty strings.
 * Returns empty array if input is falsy.
 */
function normalizeArray(array?: string[]): string[] {
  return array ? array.map((item) => item.trim()).filter(Boolean) : [];
}

/**
 * Given a dir path, guess at the package name. Considers scoped packages.
 *
 * Probably wrong.
 */
function pathToPackageName(dirpath: string): string {
  const dirs = dirpath.split(path.sep);
  if (dirs[dirs.length - 2]?.startsWith('@')) {
    return dirs.slice(dirs.length - 2).join('/');
  }
  return dirs[dirs.length - 1];
}

function createStrictEventEmitterClass() {
  const TypedEmitter: {new (): TSmokerEmitter} = EventEmitter as any;
  return TypedEmitter;
}

export class Smoker extends createStrictEventEmitterClass() {
  private readonly allWorkspaces: boolean;
  private readonly bail: boolean;
  private readonly clean: boolean;
  private readonly extraNpmInstallArgs: string[];
  private readonly force: boolean;
  private readonly includeWorkspaceRoot;
  private readonly linger: boolean;
  private readonly verbose: boolean;
  private readonly workspaces: string[];

  private cwd?: string;
  private npmInfo?: NpmInfo;

  public readonly opts: Readonly<SmokerOptions>;
  public readonly scripts: string[];

  constructor(scripts: string | string[], opts: SmokerOptions = {}) {
    super();
    if (typeof scripts === 'string') {
      scripts = [scripts];
    }
    this.scripts = scripts.map((s) => s.trim());
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
      throw new Error(
        'Option "workspace" is mutually exclusive with "all" and/or "includeRoot"',
      );
    }
    this.extraNpmInstallArgs = normalizeArray(opts.installArgs);
    this.opts = Object.freeze(opts);
  }

  /**
   * Cleans up; called by {@linkcode Smoker.smoke}.
   */
  public async cleanup() {
    if (this.cwd) {
      return this.#cleanWorkingDirectory(this.cwd);
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
        await this.#cleanWorkingDirectory(wd);
      } else if (!this.force) {
        await this.#assertNoWorkingDirectory(wd);
      }
      try {
        await fs.mkdir(wd, {recursive: true});
      } catch (err) {
        throw new Error(`Failed to create working directory ${wd}: ${err}`);
      }
    } else {
      wd = await this.#createTempDirectory();
    }

    this.cwd = wd;

    debug('(createWorkingDirectory) Using working directory %s', wd);

    return wd;
  }

  public async findNpm(): Promise<NpmInfo> {
    const getVersion = async (npmPath: string): Promise<NpmInfo> => {
      const {stdout: version} = await execa(npmPath, ['--version']);
      debug('(findNpm) Found npm %s at %s', version, npmPath);
      return {path: npmPath, version};
    };

    if (this.npmInfo) {
      return this.npmInfo;
    }

    this.emit(FIND_NPM_BEGIN);

    try {
      const npmPath = this.opts.npm ? this.opts.npm.trim() : await which('npm');
      this.npmInfo = await getVersion(npmPath);
      this.emit(FIND_NPM_OK, this.npmInfo);
      return this.npmInfo;
    } catch (err) {
      this.emit(FIND_NPM_FAILED, err as Error);
      throw err;
    }
  }

  /**
   * Runs `npm install` with every packed file in a temp dir
   */
  public async install(packItems: PackItem[]): Promise<void> {
    if (!packItems) {
      throw new TypeError('(install) "packItems" is required');
    }
    if (packItems.length) {
      // ensure we emit asynchronously
      await Promise.resolve();
      this.emit(INSTALL_BEGIN, packItems);
      const extraArgs = this.extraNpmInstallArgs;
      const cwd = await this.createWorkingDirectory();
      const npmInfo = await this.findNpm();
      // otherwise we get a deprecation warning
      const globalStyleFlag =
        npmInfo.version.startsWith('7') || npmInfo.version.startsWith('8')
          ? '--global-style'
          : '--install-strategy=shallow';
      const installArgs = [
        'install',
        globalStyleFlag,
        ...extraArgs,
        ...packItems.map(({tarballFilepath}) => tarballFilepath),
      ];

      let value: ExecaReturnValue;
      try {
        value = await this.#runNpm(installArgs, {
          cwd,
        });
      } catch (err) {
        const error = err as ExecaError;
        this.emit(INSTALL_FAILED, error);
        throw new Error(`"npm install" failed to spawn: ${error.message}`);
      }
      if (value.exitCode) {
        debug('(install) Failed: %O', value);
        const error = new Error(
          `"npm install" failed with exit code ${value.exitCode}: ${value.stdout}`,
        );
        this.emit(INSTALL_FAILED, error);
        throw error;
      }
      this.emit(INSTALL_OK, packItems);

      debug('(install) Installed %d packages', packItems.length);
    } else {
      debug('(install) No packed items; no packages to install');
    }
  }

  /**
   * Runs `npm pack` on each package in `workspaces`
   */
  public async pack(): Promise<PackItem[]> {
    const npmPath = await this.findNpm();
    this.emit(PACK_BEGIN);
    const cwd = await this.createWorkingDirectory();

    let packArgs = [
      'pack',
      '--json',
      `--pack-destination=${cwd}`,
      '--foreground-scripts=false', // suppress output of lifecycle scripts so json can be parsed
    ];
    if (this.workspaces.length) {
      packArgs = [
        ...packArgs,
        ...this.workspaces.map((w) => `--workspace=${w}`),
      ];
    } else if (this.allWorkspaces) {
      packArgs = [...packArgs, '--workspaces'];
      if (this.includeWorkspaceRoot) {
        packArgs = [...packArgs, '--include-workspace-root'];
      }
    }

    let value: execa.ExecaReturnValue<string>;
    try {
      debug('(pack) Executing: %s %s', npmPath, packArgs.join(' '));
      value = await this.#runNpm(packArgs);
    } catch (err) {
      this.emit(PACK_FAILED, err as ExecaError);
      throw err;
    }

    if (value.exitCode) {
      debug('(pack) Failed: %O', value);
      const error = new Error(
        `"npm pack" failed with exit code ${value.exitCode}`,
      );
      this.emit(PACK_FAILED, error);
      throw error;
    }

    let parsed: NpmPackItem[];

    const {stdout: packOutput} = value;
    try {
      parsed = JSON.parse(packOutput);
    } catch {
      debug('(pack) Failed to parse JSON: %s', packOutput);
      const error = new SyntaxError(
        `Failed to parse JSON output from "npm pack": ${packOutput}`,
      );
      this.emit(PACK_FAILED, error);
      throw error;
    }

    const packItems = parsed.map(({filename, name}) => {
      // workaround for https://github.com/npm/cli/issues/3405
      filename = filename.replace(/^@(.+?)\//, '$1-');
      return {
        tarballFilepath: path.join(cwd, filename),
        installPath: path.join(cwd, 'node_modules', name),
      };
    });
    debug('(pack) Packed %d packages', packItems.length);

    this.emit(PACK_OK, packItems);
    return packItems;
  }

  /**
   * Runs the script for each package in `packItems`
   */
  public async runScripts(packItems: PackItem[]): Promise<RunScriptResult[]> {
    if (!packItems) {
      throw new TypeError('(install) "packItems" is required');
    }

    const scripts = this.scripts;
    const npmPath = await this.findNpm();
    const scriptCount = scripts.length;
    const total = packItems.length * scriptCount;
    this.emit(RUN_SCRIPTS_BEGIN, {scripts, packItems, total});

    const results: RunScriptResult[] = [];

    const handleScriptReturnValue = (
      pkgName: string,
      script: string,
      value: ExecaReturnValue | ExecaError,
      current: number,
      total: number,
    ) => {
      const result = {
        pkgName,
        script,
        ...value,
      };
      results.push(result);
      if (value.failed && this.bail) {
        if (/missing script:/i.test(value.stderr)) {
          this.emit(RUN_SCRIPT_FAILED, {error: value, current, total, pkgName});
          return new Error(
            `Script "${script}" in package "${pkgName}" failed; npm was unable to find this script`,
          );
        }

        return new Error(
          `Script "${script}" in package "${pkgName}" failed with exit code ${value.exitCode}: ${value.all}`,
        );
      } else if (value.failed) {
        this.emit(RUN_SCRIPT_FAILED, {error: value, current, total, pkgName});
        debug(
          `(runScripts) Script "%s" in package "%s" failed; continuing...`,
          script,
          pkgName,
        );
      } else {
        this.emit(RUN_SCRIPT_OK, {
          value,
          current,
          total,
        });
        debug(
          '(runScripts) Successfully executed script %s in package %s',
          script,
          pkgName,
        );
      }
    };
    if (total) {
      for (const [currentScriptIdx, script] of Object.entries(scripts)) {
        const npmArgs = ['run-script', script];
        try {
          for await (const [pkgIdx, {installPath: cwd}] of Object.entries(
            packItems,
          )) {
            const pkgName = pathToPackageName(cwd);
            const current = Number(pkgIdx) + Number(currentScriptIdx);
            this.emit(RUN_SCRIPT_BEGIN, {
              script,
              cwd,
              npmArgs,
              pkgName,
              total,
              current,
            });
            debug('(pack) Executing: %s %s', npmPath, npmArgs.join(' '));

            let value: ExecaReturnValue<string>;

            try {
              value = await this.#runNpm(npmArgs, {cwd});
            } catch (err) {
              throw handleScriptReturnValue(
                pkgName,
                script,
                err as ExecaError,
                current,
                total,
              );
            }

            const err = handleScriptReturnValue(
              pkgName,
              script,
              value,
              current,
              total,
            );
            if (err) {
              throw err;
            }
          }
        } finally {
          const failures = results.reduce(
            (acc, {failed = false}) => acc + Number(failed),
            0,
          );
          if (failures) {
            this.emit(RUN_SCRIPTS_FAILED, {
              scripts,
              total,
              executed: results.length,
              failures,
              results,
            });
          } else {
            this.emit(RUN_SCRIPTS_OK, {
              scripts,
              total,
              executed: results.length,
              failures,
              results,
            });
          }
        }
      }
    } else {
      debug('(runScripts) No packed items; no scripts to run');
    }
    return results;
  }

  public async smoke() {
    this.emit(SMOKE_BEGIN);
    try {
      const packItems = await this.pack();
      debug('(smoke) Received %d packed packages', packItems.length);
      await this.install(packItems);
      await this.runScripts(packItems);
      this.emit(SMOKE_OK);
    } catch (err) {
      this.emit(SMOKE_FAILED, err as Error);
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  async #assertNoWorkingDirectory(wd: string): Promise<void> {
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

  async #cleanWorkingDirectory(wd: string): Promise<void> {
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

  async #createTempDirectory(): Promise<string> {
    // TODO EMIT
    try {
      const prefix = path.join(tmpdir(), TMP_DIR_PREFIX);
      return await fs.mkdtemp(prefix);
    } catch (err) {
      throw new Error(`Failed to create temporary working directory: ${err}`);
    }
  }

  async #runNpm(args: string[], options: execa.Options = {}) {
    const npmInfo = await this.findNpm();
    const command = `${npmInfo.path} ${args.join(' ')}`;
    this.emit(RUN_NPM_BEGIN, {
      command,
      options,
    });
    const opts = {...options};

    let proc: execa.ExecaChildProcess;

    try {
      proc = execa(npmInfo.path, args, opts);
    } catch (err) {
      this.emit(RUN_NPM_FAILED, err as ExecaError);
      throw err;
    }

    if (this.verbose) {
      proc.stdout?.pipe(process.stdout);
      proc.stderr?.pipe(process.stderr);
    }

    let value: ExecaReturnValue | undefined;
    try {
      value = await proc;
      this.emit(RUN_NPM_OK, {command, options, value});
      return value;
    } catch (e) {
      this.emit(RUN_NPM_FAILED, e as ExecaError & NodeJS.ErrnoException);
      throw e;
    }
  }
}

/**
 * Run the smoke test scripts!
 * @param scripts - One or more npm scripts to run
 * @param opts - Options
 */
export async function smoke(
  scripts: string | string[],
  opts: SmokerOptions = {},
) {
  const smoker = new Smoker(scripts, opts);
  return smoker.smoke();
}
