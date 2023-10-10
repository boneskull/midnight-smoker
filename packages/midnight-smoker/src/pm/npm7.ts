import {red} from 'chalk';
import Debug from 'debug';
import path from 'node:path';
import type {SemVer} from 'semver';
import {InstallError, PackError, PackParseError} from '../error';
import type {InstallManifest} from '../types';
import type {CorepackExecutor} from './corepack';
import type {ExecError, ExecResult} from './executor';
import {GenericNpmPackageManager} from './npm';
import type {
  InstallResult,
  PackOpts,
  PackageManager,
  PackageManagerModule,
  PackageManagerOpts,
} from './pm';

/**
 * Type of item in the {@linkcode NpmPackItem.files} array.
 * @internal
 */
export interface NpmPackItemFileEntry {
  mode: number;
  path: string;
  size: number;
}

/**
 * JSON output of `npm pack`
 * @internal
 */
export interface NpmPackItem {
  bundled: any[];
  entryCount: number;
  filename: string;
  files: NpmPackItemFileEntry[];
  id: string;
  integrity: string;
  name: string;
  shasum: string;
  size: number;
  unpackedSize: number;
  version: string;
}

export class Npm7 extends GenericNpmPackageManager implements PackageManager {
  protected debug: Debug.Debugger;

  public static readonly bin = 'npm';
  public readonly name = 'npm';

  constructor(executor: CorepackExecutor, opts: PackageManagerOpts = {}) {
    super(executor, opts);
    this.debug = Debug(`midnight-smoker:pm:npm7`);
  }

  public static accepts(semver: SemVer) {
    return Boolean(semver.compare('7.0.0') - semver.compare('9.0.0'));
  }

  public static load(executor: CorepackExecutor, opts?: PackageManagerOpts) {
    return new Npm7(executor, opts);
  }

  public async install(manifest: InstallManifest): Promise<InstallResult> {
    const {packedPkgs, tarballRootDir} = manifest;
    if (!packedPkgs?.length) {
      throw new TypeError('(install) Non-empty "manifest" arg is required');
    }

    const additionalDeps = manifest.additionalDeps ?? [];

    // otherwise we get a deprecation warning
    const installArgs = [
      'install',
      '--no-audit',
      '--no-package-lock',
      '--global-style',
      ...packedPkgs.map(({tarballFilepath}) => tarballFilepath),
      ...additionalDeps,
    ];

    let installResult: InstallResult;
    try {
      installResult = await this.executor.exec(installArgs, {
        cwd: tarballRootDir,
      });
    } catch (e) {
      const err = e as ExecError;
      let parsed: {error: {summary: string}} | undefined;
      try {
        this.debug('Trying to parse stdout: %s', err.stdout);
        parsed = JSON.parse(err.stdout);
      } catch {
        // ignore
      }
      if (parsed?.error) {
        throw new InstallError(
          `Package manager "${this.name}" failed to install packages:\n\n${red(
            parsed.error.summary,
          )}`,
          this.name,
          {
            error: err as Error,
            output: err.stderr,
          },
        );
      }
      throw new InstallError(
        `Package manager "${this.name}" failed to install packages`,
        this.name,
        {error: err as Error},
      );
    }
    if (installResult.exitCode) {
      this.debug('(install) Failed: %O', installResult);
      throw new InstallError(
        `Package manager "${this.name}" failed to install packages`,
        this.name,
        {exitCode: installResult.exitCode},
      );
    }

    this.debug('(install) Installed %d packages', packedPkgs.length);

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

    let packResult: ExecResult;

    try {
      packResult = await this.executor.exec(packArgs);
    } catch (e) {
      const err = e as ExecError;
      this.debug('(pack) Failed: %O', err);
      // in some cases we can get something more user-friendly via the JSON output
      let parsed: {error: {summary: string}} | undefined;
      try {
        this.debug('Trying to parse stdout: %s', err.stdout);
        parsed = JSON.parse(err.stdout);
      } catch {
        // ignore
      }
      if (parsed?.error) {
        throw new PackError(
          `Package manager "${this.name}" failed to pack:\n\n${red(
            parsed.error.summary,
          )}`,
          this.name,
          {
            error: err as Error,
            output: err.stderr,
          },
        );
      }
      throw new PackError(
        `Package manager "${this.name}" failed to pack`,
        this.name,
        {
          error: err as Error,
        },
      );
    }

    // I am not sure why exitCode would be non-zero here.  keep an eye on this;
    // it might never be called
    if (packResult.exitCode) {
      this.debug('(pack) Failed: %O', packResult);
      throw new PackError(
        `Package manager "${this.name}" failed to pack`,
        this.name,
        {
          exitCode: packResult.exitCode,
          output: packResult.stderr,
        },
      );
    }

    let parsed: NpmPackItem[];

    const {stdout: packOutput} = packResult;
    try {
      parsed = JSON.parse(packOutput);
    } catch (err) {
      this.debug('(pack) Failed to parse JSON: %s', packOutput);
      throw new PackParseError(
        `Failed to parse JSON result of pack from package manager "${this.name}"`,
        this.name,
        err as Error,
        packOutput,
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
    this.debug('(pack) Packed %d packages', packedPkgs.length);

    return {packedPkgs, tarballRootDir: dest};
  }
}

export default Npm7 satisfies PackageManagerModule;
