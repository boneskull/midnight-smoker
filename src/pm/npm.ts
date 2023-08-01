import createDebug from 'debug';
import {
  node as execa,
  type ExecaError,
  type Options as ExecaOptions,
  type ExecaReturnValue,
} from 'execa';
import path from 'node:path';
import which from 'which';
import {SmokerError} from '../error';
import type {PackedPackage, RunScriptResult, InstallManifest} from '../types';
import type {
  InstallOpts,
  InstallResult,
  PackOpts,
  PackageManager,
  PackageManagerFactory,
  PackageManagerOpts,
} from './pm';

const debug = createDebug('midnight-smoker:npm');

/**
 * Type of item in the {@linkcode NpmPackItem.files} array.
 * @internal
 */
export interface NpmPackItemFileEntry {
  path: string;
  size: number;
  mode: number;
}

/**
 * JSON output of `npm pack`
 * @internal
 */
export interface NpmPackItem {
  id: string;
  name: string;
  version: string;
  size: number;
  unpackedSize: number;
  shasum: string;
  integrity: string;
  filename: string;
  files: NpmPackItemFileEntry[];
  entryCount: number;
  bundled: any[];
}

export class Npm implements PackageManager {
  public readonly name = 'npm';

  constructor(private readonly opts: PackageManagerOpts = {}) {}

  public async exec(args: string[], execaOpts: ExecaOptions = {}) {
    const binPath = await Npm.getBinPath(this.opts.binPath);
    const command = `${binPath} ${args.join(' ')}`;
    debug(`Executing: ${command}`);
    const proc = execa(binPath, args, execaOpts);

    if (this.opts.verbose) {
      proc.stdout?.pipe(process.stdout);
      proc.stderr?.pipe(process.stderr);
    }

    return await proc;
  }

  public static async getBinPath(binPath?: string): Promise<string> {
    if (binPath) {
      return binPath;
    }
    try {
      return await which('npm');
    } catch (err) {
      throw new SmokerError(
        `Failed to find "${this.name}" in PATH: ${(err as Error).message}`,
      );
    }
  }

  public static async getVersion(binPath: string): Promise<string> {
    if (!binPath) {
      throw new TypeError('(getVersion) "binPath" arg is required');
    }
    const {stdout: version} = await execa(binPath, ['--version']);
    return version.trim();
  }

  public async install(
    manifest: InstallManifest,
    opts: InstallOpts = {},
  ): Promise<InstallResult> {
    const {packedPkgs, tarballRootDir} = manifest;
    if (!packedPkgs?.length) {
      throw new TypeError('(install) Non-empty "packedPkgs" arg is required');
    }

    const extraArgs = opts.extraArgs ?? [];
    const additionalDeps = manifest.additionalDeps ?? [];

    const version = await Npm.getVersion(
      await Npm.getBinPath(this.opts?.binPath),
    );

    // otherwise we get a deprecation warning
    const globalStyleFlag =
      version.startsWith('7') || version.startsWith('8')
        ? '--global-style'
        : '--install-strategy=shallow';
    const installArgs = [
      'install',
      globalStyleFlag,
      ...extraArgs,
      ...packedPkgs.map(({tarballFilepath}) => tarballFilepath),
      ...additionalDeps,
    ];

    let installResult: InstallResult;
    try {
      installResult = await this.exec(installArgs, {
        cwd: tarballRootDir,
      });
    } catch (err) {
      throw new SmokerError(
        `(install) ${this.name} failed to spawn: ${(err as Error).message}`,
      );
    }
    if (installResult.exitCode) {
      debug('(install) Failed: %O', installResult);
      throw new SmokerError(
        `(install) Installation failed with exit code ${installResult.exitCode}: ${installResult.stderr}`,
      );
    }

    debug('(install) Installed %d packages', packedPkgs.length);

    return installResult;
  }

  public async pack(
    dest: string,
    opts: PackOpts = {},
  ): Promise<InstallManifest> {
    if (!dest) {
      throw new TypeError('(pack) "dest" arg is required');
    }
    let packArgs = [
      'pack',
      '--json',
      `--pack-destination=${dest}`,
      '--foreground-scripts=false', // suppress output of lifecycle scripts so json can be parsed
    ];
    if (opts.workspaces?.length) {
      packArgs = [
        ...packArgs,
        ...opts.workspaces.map((w) => `--workspace=${w}`),
      ];
    } else if (opts.allWorkspaces) {
      packArgs = [...packArgs, '--workspaces'];
      if (opts.includeWorkspaceRoot) {
        packArgs = [...packArgs, '--include-workspace-root'];
      }
    }

    let packResult: ExecaReturnValue<string>;

    try {
      packResult = await this.exec(packArgs);
    } catch (err) {
      throw new SmokerError(
        `(pack) ${this.name} failed to spawn: ${(err as Error).message}`,
      );
    }

    if (packResult.exitCode) {
      debug('(pack) Failed: %O', packResult);
      throw new SmokerError(
        `(pack) Packing failed with exit code ${packResult.exitCode}: ${packResult.stderr}`,
      );
    }

    let parsed: NpmPackItem[];

    const {stdout: packOutput} = packResult;
    try {
      parsed = JSON.parse(packOutput);
    } catch {
      debug('(pack) Failed to parse JSON: %s', packOutput);
      throw new SmokerError(
        `(pack) Failed to parse JSON output from "${this.name} pack": ${packOutput}`,
      );
    }

    const packedPkgs = parsed.map(({filename, name}) => {
      // workaround for https://github.com/npm/cli/issues/3405
      filename = filename.replace(/^@(.+?)\//, '$1-');
      return {
        tarballFilepath: path.join(dest, filename),
        installPath: path.join(dest, 'node_modules', name),
        pkgName: name,
      };
    });
    debug('(pack) Packed %d packages', packedPkgs.length);

    return {packedPkgs, tarballRootDir: dest};
  }

  public async runScript(
    packedPkg: PackedPackage,
    script: string,
  ): Promise<RunScriptResult> {
    if (!packedPkg) {
      throw new TypeError('(runScript) "packedPkg" arg is required');
    }
    const npmArgs = ['run-script', script];
    const {pkgName, installPath: cwd} = packedPkg;

    let result: RunScriptResult;
    try {
      const rawResult = await this.exec(npmArgs, {cwd});
      result = {pkgName, script, rawResult, cwd};
    } catch (err) {
      const error = err as ExecaError;
      result = {
        pkgName,
        script,
        error: new SmokerError(
          `(runScript) Script "${script}" in package "${pkgName}" failed: ${error.message}`,
        ),
        rawResult: error,
        cwd,
      };
    }

    if (!result.error && result.rawResult.failed) {
      let message: string;
      if (
        result.rawResult.stderr &&
        /missing script:/i.test(result.rawResult.stderr)
      ) {
        message = `(runScript) Script "${script}" in package "${pkgName}" failed; script not found`;
      } else {
        if (result.rawResult.exitCode) {
          message = `(runScript) Script "${script}" in package "${pkgName}" failed with exit code ${result.rawResult.exitCode}: ${result.rawResult.all}`;
        } else {
          message = `(runScript) Script "${script}" in package "${pkgName}" failed: ${result.rawResult.all}`;
        }
      }
      result.error = new SmokerError(message);
    }

    if (result.error) {
      debug(
        `(runScripts) Script "%s" in package "%s" failed; continuing...`,
        script,
        pkgName,
      );
    } else {
      debug(
        '(runScripts) Successfully executed script %s in package %s',
        script,
        pkgName,
      );
    }

    return result;
  }
}

const npmFactory: PackageManagerFactory = (opts?: PackageManagerOpts) => {
  return new Npm(opts);
};

export default npmFactory;
