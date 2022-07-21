const which = require('which');
const debug = require('debug')('midnight-smoker');
const fs = require('node:fs/promises');
const path = require('node:path');
const {tmpdir} = require('node:os');
const {node: execa} = require('execa');
const console = require('node:console');

const TMP_DIR_PREFIX = 'midnight-smoker-';

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

class Smoker {
  /**
   * @type {string[]}
   */
  scripts;

  /** @type {string|undefined} */
  #npmPath;

  /** @type {boolean} */
  #force = false;

  /**
   * @type {Readonly<SmokerOptions>}
   */
  opts;

  /** @type {string|undefined} */
  #cwd;

  /**
   * @type {boolean}
   */
  #quiet = false;

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

  /**
   *
   * @param {string|string[]} scripts
   * @param {SmokerOptions} [opts]
   */
  constructor(scripts, opts = {}) {
    if (typeof scripts === 'string') {
      scripts = [scripts];
    }
    this.scripts = scripts.map((s) => s.trim());
    opts = {...opts};

    this.#force = Boolean(opts.force);
    this.#clean = Boolean(opts.clean);
    this.#quiet = Boolean(opts.quiet);
    this.#includeWorkspaceRoot = Boolean(opts.includeRoot);
    if (this.#includeWorkspaceRoot) {
      opts.all = true;
    }
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
    try {
      const packItems = await this.pack();
      debug('(smoke) Received %d packed packages', packItems.length);
      await this.install(packItems);
      await this.runScript(packItems);
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
    const npmPath = await which('npm');
    debug('(findNpm) Found npm at %s', npmPath);
    this.#npmPath = npmPath;
    return npmPath;
  }

  /**
   *
   * @param {string} wd
   * @returns {Promise<void>}
   */
  async #cleanWorkingDirectory(wd) {
    try {
      await fs.rm(wd, {recursive: true});
    } catch (e) {
      const err = /** @type {NodeJS.ErrnoException} */ (e);
      if (err.code !== 'ENOENT') {
        throw new Error(`Failed to clean working directory ${wd}: ${e}`);
      }
    }
  }

  /**
   *
   * @param {string} wd
   * @returns {Promise<void>}
   */
  async #assertNoWorkingDirectory(wd) {
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
    const cwd = await this.createWorkingDirectory();

    let packArgs = [
      'pack',
      '--json',
      `--pack-destination=${cwd}`,
      '--foreground-scripts=false', // suppress output of lifecycle scripts so json can be parsed
      '--silent', // XXX needed?
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

    debug('(pack) Executing: %s %s', npmPath, packArgs.join(' '));
    const proc = execa(npmPath, packArgs);

    if (!this.#quiet) {
      proc.stdout?.on('data', (data) => {
        console.error(String(data));
      });
    }
    const {exitCode, stdout: packOutput} = await proc;

    if (exitCode) {
      throw new Error(`"npm pack" failed with exit code ${exitCode}`);
    }
    /** @type {import('../static').NpmPackItem[]} */
    let parsed;

    try {
      parsed = JSON.parse(packOutput);
    } catch (err) {
      debug('(pack) Failed to parse JSON: %s', packOutput);
      const {message} = /** @type {SyntaxError} */ (err);
      throw new Error(
        `Failed to parse JSON output from "npm pack": ${message}`
      );
    }

    const result = parsed.map(({filename, name}) => {
      // workaround for https://github.com/npm/cli/issues/3405
      filename = filename.replace(/^@(.+?)\//, '$1-');
      return {
        tarballFilepath: path.join(cwd, filename),
        installPath: path.join(cwd, 'node_modules', name),
      };
    });
    debug('(pack) Packed %d packages', result.length);
    return result;
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
      const extraArgs = this.#extraNpmInstallArgs;
      const npmPath = await this.findNpm();
      const cwd = await this.createWorkingDirectory();
      const installArgs = [
        'install',
        ...extraArgs,
        ...packItems.map(({tarballFilepath}) => tarballFilepath),
      ];

      const proc = execa(npmPath, installArgs, {
        cwd,
      });

      if (!this.#quiet) {
        proc.stdout?.on('data', (data) => {
          console.error(String(data));
        });
      }

      const {exitCode: installExitCode} = await proc;

      if (installExitCode) {
        throw new Error(
          `"npm install" failed with exit code ${installExitCode}`
        );
      }
      debug('(install) Installed %d packages', packItems.length);
      return;
    }

    debug('(install) No packed items; no packages to install');
  }

  /**
   * Runs the script for each package in `packItems`
   * @param {PackItem[]} packItems
   * @returns {Promise<void>}
   */
  async runScript(packItems) {
    if (!packItems) {
      throw new TypeError('(install) "packItems" is required');
    }
    if (packItems.length) {
      const scripts = this.scripts;
      const npmPath = await this.findNpm();

      for (const script of scripts) {
        const execArgs = ['run-script', script];

        for await (const {installPath: cwd} of packItems) {
          debug('(pack) Executing: %s %s', npmPath, execArgs.join(' '));
          const proc = execa(npmPath, execArgs, {
            cwd,
          });
          const pkgName = pathToPackageName(cwd);

          if (!this.#quiet) {
            proc.stdout?.on('data', (data) => {
              console.error(String(data));
            });
          }

          const {exitCode, stderr} = await proc;
          if (exitCode) {
            if (/missing script:/i.test(stderr)) {
              throw new Error(
                `npm was unable to find script "${script}" in package "${pkgName}"`
              );
            }

            throw new Error(
              `npm script "${script}" failed with exit code ${exitCode}: ${stderr}`
            );
          } else {
            debug(
              '(runScript) Successfully executed script %s in package %s',
              script,
              pkgName
            );
          }
        }
      }
      return;
    }
    debug('(runScript) No packed items; no scripts to run');
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
 *
 * @param {string|string[]} scripts - One or more npm scripts to run
 * @param {SmokerOptions} [opts] - Options
 */
exports.smoke = async function smoke(scripts, opts = {}) {
  const smoker = new Smoker(scripts, opts);
  return smoker.smoke();
};

/**
 * @typedef {import('../static').SmokerOptions} SmokerOptions
 * @typedef {import('../static').PackItem} PackItem
 * @typedef {import('../static').PackOptions} PackOptions
 */
