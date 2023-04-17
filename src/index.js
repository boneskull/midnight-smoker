const which = require('which');
const debug = require('debug')('midnight-smoker');
const fs = require('node:fs/promises');
const path = require('node:path');
const {tmpdir} = require('node:os');
const execa = require('execa');
const {EventEmitter} = require('node:events');

const TMP_DIR_PREFIX = 'midnight-smoker-';

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
} = (exports.events = /** @type {const} */ ({
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
}));

/**
 * Trims all strings in an array and removes empty strings.
 * Returns empty array if input is falsy.
 * @param {string[]} [array]
 * @returns {string[]}
 */
function normalizeArray(array) {
  return array ? array.map((item) => item.trim()).filter(Boolean) : [];
}

/**
 * Given a dir path, guess at the package name. Considers scoped packages.
 *
 * Probably wrong.
 *
 * @param {string} dirpath
 * @returns {string}
 */
function pathToPackageName(dirpath) {
  const dirs = dirpath.split(path.sep);
  if (dirs[dirs.length - 2]?.startsWith('@')) {
    return dirs.slice(dirs.length - 2).join('/');
  }
  return dirs[dirs.length - 1];
}

function createStrictEventEmitterClass() {
  const TypedEmitter = /** @type { {new(): TSmokerEmitter} } */ (
    /** @type {unknown} */ (EventEmitter)
  );
  return TypedEmitter;
}

class Smoker extends createStrictEventEmitterClass() {
  /**
   * @type {string[]}
   */
  scripts;

  /**
   * @type {Readonly<SmokerOptions>}
   */
  opts;

  /** @type {string|undefined} */
  #npmPath;

  /** @type {boolean} */
  #force = false;

  /** @type {boolean} */
  #linger = false;

  /** @type {string|undefined} */
  #cwd;

  /**
   * @type {boolean}
   */
  #verbose = false;

  /** @type {boolean} */
  #clean = false;

  /** @type {string[]} */
  #workspaces;

  /** @type {boolean} */
  #allWorkspaces = false;

  /** @type {boolean} */
  #includeWorkspaceRoot = false;

  /** @type {string[]} */
  #extraNpmInstallArgs;

  /** @type {boolean} */
  #bail = false;

  /**
   *
   * @param {string|string[]} scripts
   * @param {SmokerOptions} [opts]
   */
  constructor(scripts, opts = {}) {
    super();
    if (typeof scripts === 'string') {
      scripts = [scripts];
    }
    this.scripts = scripts.map((s) => s.trim());
    opts = {...opts};

    this.#linger = Boolean(opts.linger);
    this.#force = Boolean(opts.force);
    this.#clean = Boolean(opts.clean);
    this.#verbose = Boolean(opts.verbose);
    this.#includeWorkspaceRoot = Boolean(opts.includeRoot);
    if (this.#includeWorkspaceRoot) {
      opts.all = true;
    }
    this.#bail = Boolean(opts.bail);
    this.#allWorkspaces = Boolean(opts.all);
    this.#workspaces = normalizeArray(opts.workspace);
    if (this.#allWorkspaces && this.#workspaces.length) {
      throw new Error(
        'Option "workspace" is mutually exclusive with "all" and/or "includeRoot"'
      );
    }
    this.#extraNpmInstallArgs = normalizeArray(opts.installArgs);
    this.opts = Object.freeze(opts);
  }

  async smoke() {
    this.emit(SMOKE_BEGIN);
    try {
      const packItems = await this.pack();
      debug('(smoke) Received %d packed packages', packItems.length);
      await this.install(packItems);
      await this.runScripts(packItems);
      this.emit(SMOKE_OK);
    } catch (err) {
      this.emit(SMOKE_FAILED, /** @type {any} */ (err));
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  /**
   *
   * @returns {Promise<string>}
   */
  async findNpm() {
    if (this.#npmPath) {
      return this.#npmPath;
    }
    if (this.opts.npm) {
      this.#npmPath = this.opts.npm.trim();
      return this.#npmPath;
    }
    this.emit(FIND_NPM_BEGIN);
    try {
      const npmPath = await which('npm');
      // using #runNpm here would be recursive
      const {stdout: version} = await execa(npmPath, ['--version']);
      debug('(findNpm) Found npm %s at %s', version, npmPath);
      this.#npmPath = npmPath;
      this.emit(FIND_NPM_OK, npmPath);
      return npmPath;
    } catch (err) {
      this.emit(FIND_NPM_FAILED, /** @type {Error} */ (err));
      throw err;
    }
  }

  /**
   *
   * @param {string} wd
   * @returns {Promise<void>}
   */
  async #cleanWorkingDirectory(wd) {
    if (!this.#linger) {
      try {
        await fs.rm(wd, {recursive: true});
      } catch (e) {
        const err = /** @type {NodeJS.ErrnoException} */ (e);
        if (err.code !== 'ENOENT') {
          throw new Error(`Failed to clean working directory ${wd}: ${e}`);
        }
      }
    }
  }

  /**
   *
   * @param {string} wd
   * @returns {Promise<void>}
   */
  async #assertNoWorkingDirectory(wd) {
    // TODO EMIT
    try {
      await fs.stat(wd);
    } catch {
      return;
    }
    throw new Error(
      `Working directory ${wd} already exists. Use "force" option to proceed anyhow.`
    );
  }

  /**
   * @returns {Promise<string>}
   */
  async #createTempDirectory() {
    // TODO EMIT
    try {
      const prefix = path.join(tmpdir(), TMP_DIR_PREFIX);
      return await fs.mkdtemp(prefix);
    } catch (err) {
      throw new Error(`Failed to create temporary working directory: ${err}`);
    }
  }

  /**
   *
   * @returns {Promise<string>}
   */
  async createWorkingDirectory() {
    // TODO EMIT
    if (this.#cwd) {
      return this.#cwd;
    }
    let wd = this.opts.dir;
    if (wd) {
      if (this.#force && this.#clean) {
        await this.#cleanWorkingDirectory(wd);
      } else if (!this.#force) {
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

    this.#cwd = wd;

    debug('(createWorkingDirectory) Using working directory %s', wd);

    return wd;
  }

  /**
   * Runs `npm pack` on each package in `workspaces`
   * @returns {Promise<PackItem[]>}
   */
  async pack() {
    const npmPath = await this.findNpm();
    this.emit(PACK_BEGIN);
    const cwd = await this.createWorkingDirectory();

    let packArgs = [
      'pack',
      '--json',
      `--pack-destination=${cwd}`,
      '--foreground-scripts=false', // suppress output of lifecycle scripts so json can be parsed
    ];
    if (this.#workspaces.length) {
      packArgs = [
        ...packArgs,
        ...this.#workspaces.map((w) => `--workspace=${w}`),
      ];
    } else if (this.#allWorkspaces) {
      packArgs = [...packArgs, '--workspaces'];
      if (this.#includeWorkspaceRoot) {
        packArgs = [...packArgs, '--include-workspace-root'];
      }
    }

    /** @type {execa.ExecaReturnValue<string>} */
    let value;
    try {
      debug('(pack) Executing: %s %s', npmPath, packArgs.join(' '));
      value = await this.#runNpm(packArgs);
    } catch (err) {
      this.emit(PACK_FAILED, /** @type {execa.ExecaError} */ (err));
      throw err;
    }

    if (value.exitCode) {
      debug('(pack) Failed: %O', value);
      const error = new Error(
        `"npm pack" failed with exit code ${value.exitCode}`
      );
      this.emit(PACK_FAILED, error);
      throw error;
    }
    /** @type {import('./static').NpmPackItem[]} */
    let parsed;

    const {stdout: packOutput} = value;
    try {
      parsed = JSON.parse(packOutput);
    } catch {
      debug('(pack) Failed to parse JSON: %s', packOutput);
      const error = new SyntaxError(
        `Failed to parse JSON output from "npm pack": ${packOutput}`
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
   *
   * @param {string[]} args
   * @param {execa.Options} [options]
   */
  async #runNpm(args, options = {}) {
    const npmPath = await this.findNpm();
    const command = `${npmPath} ${args.join(' ')}`;
    this.emit(RUN_NPM_BEGIN, {
      command,
      options,
    });
    const opts = {...options};

    /** @type {execa.ExecaChildProcess} */
    let proc;

    try {
      proc = execa(npmPath, args, opts);
    } catch (err) {
      this.emit(RUN_NPM_FAILED, /** @type {execa.ExecaError} */ (err));
      throw err;
    }

    if (this.#verbose) {
      proc.stdout?.pipe(process.stdout);
      proc.stderr?.pipe(process.stderr);
    }

    /**
     * @type {execa.ExecaReturnValue|undefined}
     */
    let value;
    /** @type {execa.ExecaError & NodeJS.ErrnoException|undefined} */
    let error;
    try {
      value = await proc;
      this.emit(RUN_NPM_OK, {command, options, value});
      return value;
    } catch (e) {
      this.emit(
        RUN_NPM_FAILED,
        /** @type {execa.ExecaError & NodeJS.ErrnoException} */ (e)
      );
      throw error;
    }
  }

  /**
   * Runs `npm install` with every packed file in a temp dir
   * @param {PackItem[]} packItems
   * @returns {Promise<void>}
   */
  async install(packItems) {
    if (!packItems) {
      throw new TypeError('(install) "packItems" is required');
    }
    if (packItems.length) {
      // ensure we emit asynchronously
      await Promise.resolve();
      this.emit(INSTALL_BEGIN, packItems);
      const extraArgs = this.#extraNpmInstallArgs;
      const cwd = await this.createWorkingDirectory();
      const installArgs = [
        'install',
        '--global-style',
        ...extraArgs,
        ...packItems.map(({tarballFilepath}) => tarballFilepath),
      ];

      /** @type {execa.ExecaReturnValue} */
      let value;
      try {
        value = await this.#runNpm(installArgs, {
          cwd,
        });
      } catch (err) {
        const error = /** @type {execa.ExecaError} */ (err);
        this.emit(INSTALL_FAILED, error);
        throw new Error(`"npm install" failed to spawn: ${error.message}`);
      }
      if (value.exitCode) {
        debug('(install) Failed: %O', value);
        const error = new Error(
          `"npm install" failed with exit code ${value.exitCode}: ${value.stdout}`
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
   * Runs the script for each package in `packItems`
   * @param {PackItem[]} packItems
   * @returns {Promise<RunScriptResult[]>}
   */
  async runScripts(packItems) {
    if (!packItems) {
      throw new TypeError('(install) "packItems" is required');
    }

    const scripts = this.scripts;
    const npmPath = await this.findNpm();
    const scriptCount = scripts.length;
    const total = packItems.length * scriptCount;
    this.emit(RUN_SCRIPTS_BEGIN, {scripts, packItems, total});
    /** @type {RunScriptResult[]} */
    const results = [];

    /**
     *
     * @param {string} pkgName
     * @param {string} script
     * @param {execa.ExecaReturnValue|execa.ExecaError} value
     * @param {number} current
     * @param {number} total
     */
    const handleScriptReturnValue = (
      pkgName,
      script,
      value,
      current,
      total
    ) => {
      const result = {
        pkgName,
        script,
        ...value,
      };
      results.push(result);
      if (value.failed && this.#bail) {
        if (/missing script:/i.test(value.stderr)) {
          this.emit(RUN_SCRIPT_FAILED, {error: value, current, total, pkgName});
          return new Error(
            `Script "${script}" in package "${pkgName}" failed; npm was unable to find this script`
          );
        }

        return new Error(
          `Script "${script}" in package "${pkgName}" failed with exit code ${value.exitCode}: ${value.all}`
        );
      } else if (value.failed) {
        this.emit(RUN_SCRIPT_FAILED, {error: value, current, total, pkgName});
        debug(
          `(runScripts) Script "%s" in package "%s" failed; continuing...`,
          script,
          pkgName
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
          pkgName
        );
      }
    };
    if (total) {
      for (const [currentScriptIdx, script] of Object.entries(scripts)) {
        const npmArgs = ['run-script', script];
        try {
          for await (const [pkgIdx, {installPath: cwd}] of Object.entries(
            packItems
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

            /** @type {execa.ExecaReturnValue<string>} */
            let value;

            try {
              value = await this.#runNpm(npmArgs, {cwd});
            } catch (err) {
              throw handleScriptReturnValue(
                pkgName,
                script,
                /** @type {execa.ExecaError} */ (err),
                current,
                total
              );
            }

            const err = handleScriptReturnValue(
              pkgName,
              script,
              value,
              current,
              total
            );
            if (err) {
              throw err;
            }
          }
        } finally {
          const failures = results.reduce(
            (acc, {failed = false}) => acc + Number(failed),
            0
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

  /**
   * Cleans up; called by {@linkcode Smoker.smoke}.
   */
  async cleanup() {
    if (this.#cwd) {
      return this.#cleanWorkingDirectory(this.#cwd);
    }
  }
}

exports.Smoker = Smoker;

/**
 * Run the smoke test scripts!
 * @param {string|string[]} scripts - One or more npm scripts to run
 * @param {SmokerOptions} [opts] - Options
 */
exports.smoke = async function smoke(scripts, opts = {}) {
  const smoker = new Smoker(scripts, opts);
  return smoker.smoke();
};

/**
 * @typedef {import('./static').SmokerOptions} SmokerOptions
 * @typedef {import('./static').PackItem} PackItem
 * @typedef {import('./static').PackOptions} PackOptions
 * @typedef {import('./static').RunScriptResult} RunScriptResult
 * @typedef {import('./static').Events} Events
 * @typedef {import('./static').TSmokerEmitter} TSmokerEmitter
 */
