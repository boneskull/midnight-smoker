import Debug from 'debug';
import path from 'node:path';
import type {SemVer} from 'semver';
import {InstallError, PackError, RunScriptError} from '../error';
import type {
  InstallManifest,
  PackedPackage,
  RunManifest,
  RunScriptResult,
} from '../types';
import {readPackageJson} from '../util';
import type {CorepackExecutor} from './corepack';
import type {ExecError, ExecResult} from './executor';
import type {
  InstallResult,
  PackOpts,
  PackageManager,
  PackageManagerModule,
  PackageManagerOpts,
} from './pm';

interface WorkspaceInfo {
  location: string;

  [key: string]: any;
}

export class YarnClassic implements PackageManager {
  protected readonly debug: Debug.Debugger;

  public static readonly bin = 'yarn';

  public readonly name = 'yarn';

  constructor(
    protected readonly executor: CorepackExecutor,
    protected readonly opts: PackageManagerOpts = {},
  ) {
    this.debug = Debug(`midnight-smoker:pm:yarn1`);
  }

  public static accepts(semver: SemVer) {
    return Boolean(semver.compare('1.0.0') - semver.compare('2.0.0'));
  }

  public static load(executor: CorepackExecutor, opts?: PackageManagerOpts) {
    return new YarnClassic(executor, opts);
  }

  public async install(manifest: InstallManifest): Promise<InstallResult> {
    const {packedPkgs, tarballRootDir} = manifest;
    if (!packedPkgs?.length) {
      throw new TypeError(
        '(install) Non-empty "packedPkgs" prop in "manifest" arg is required',
      );
    }

    const additionalDeps = manifest.additionalDeps ?? [];

    const installArgs = [
      'add',
      '--no-lockfile',
      '--force',
      ...packedPkgs.map(({tarballFilepath}) => tarballFilepath),
      ...additionalDeps,
    ];

    let installResult: InstallResult;
    try {
      installResult = await this.executor.exec(installArgs, {
        cwd: tarballRootDir,
      });
    } catch (err) {
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
    type PackCommand = {
      command: string[];
      cwd: string;
      tarball: string;
      pkgName: string;
    };

    const seenSlugs = new Set();
    const computeSlug = (info: WorkspaceInfo) => {
      let slug = path.basename(info.location);
      for (let i = 0; i++; seenSlugs.has(slug)) {
        slug = `${slug}-${i}`;
      }
      seenSlugs.add(slug);
      return slug;
    };

    const finalizePackCommand = (
      info: WorkspaceInfo,
      pkgName: string,
    ): PackCommand => {
      const slug = computeSlug(info);
      const tarball = path.join(dest, `${slug}.tgz`);
      const cwd = path.isAbsolute(info.location)
        ? info.location
        : path.join(process.cwd(), info.location);
      return {
        command: [...basePackArgs, `--filename=${tarball}`],
        cwd,
        tarball,
        pkgName,
      };
    };

    const getWorkspaceRootPackageName = async () => {
      const {packageJson} = await readPackageJson({
        cwd: process.cwd(),
        strict: true,
      });
      const {name = path.dirname(process.cwd())} = packageJson;
      return name;
    };

    if (!dest) {
      throw new TypeError('(pack) "dest" arg is required');
    }

    const commands: PackCommand[] = [];

    const basePackArgs = ['pack', '--json'];

    const shouldUseWorkspaces = Boolean(
      opts.allWorkspaces || opts.workspaces?.length,
    );

    if (shouldUseWorkspaces) {
      let workspaceInfo: Record<string, WorkspaceInfo>;
      try {
        let {stdout} = await this.executor.exec(['workspaces', 'info']);
        const lines = stdout.split(/\r?\n/);
        lines.shift();
        lines.pop();
        stdout = lines.join('\n');
        workspaceInfo = JSON.parse(stdout);
      } catch (err) {
        throw new PackError(
          `Package manager "${this.name}" unable to read workspace information`,
          this.name,
          {error: err as Error},
        );
      }

      if (opts.workspaces?.length) {
        commands.push(
          ...opts.workspaces.map((workspace) => {
            let info: WorkspaceInfo | undefined = workspaceInfo[workspace];
            let name: string;
            if (!info) {
              [name, info] = Object.entries(workspaceInfo).find(
                ([, info]) => info.location === workspace,
              );
              if (!info) {
                throw new PackError(
                  `Package manager "${this.name}" unable to find workspace "${workspace}"`,
                  this.name,
                );
              }
            } else {
              name = workspace;
            }
            return finalizePackCommand(info, name);
          }),
        );
      } else {
        // allWorkspaces must be true
        commands.push(
          ...Object.entries(workspaceInfo).map(([name, info]) =>
            finalizePackCommand(info, name),
          ),
        );
        if (opts.includeWorkspaceRoot) {
          commands.push(
            finalizePackCommand(
              {location: process.cwd()},
              await getWorkspaceRootPackageName(),
            ),
          );
        }
      }
    } else {
      commands.push(
        finalizePackCommand(
          {location: process.cwd()},
          await getWorkspaceRootPackageName(),
        ),
      );
    }

    this.debug(commands);

    const packedPkgs: PackedPackage[] = [];

    for await (const {command, cwd, tarball, pkgName} of commands) {
      let packResult: ExecResult;
      try {
        packResult = await this.executor.exec(command, {cwd});
      } catch (err) {
        throw new PackError(
          `Package manager "${this.name}" failed to pack`,
          this.name,
          {
            error: err as Error,
          },
        );
      }

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

      packedPkgs.push({
        tarballFilepath: tarball,
        installPath: path.join(dest, 'node_modules', pkgName),
        pkgName,
      });
    }

    this.debug('(pack) Packed %d packages', packedPkgs.length);

    return {packedPkgs, tarballRootDir: dest};
  }

  public async runScript(manifest: RunManifest): Promise<RunScriptResult> {
    if (!manifest) {
      throw new TypeError('(runScript) "manifest" arg is required');
    }
    const {script, packedPkg} = manifest;
    const args = ['run', script];
    const {pkgName, installPath: cwd} = packedPkg;
    let result: RunScriptResult;
    try {
      const rawResult = await this.executor.exec(args, {
        cwd,
      });
      result = {pkgName, script, rawResult, cwd};
    } catch (err) {
      const error = err as ExecError;
      result = {
        pkgName,
        script,
        rawResult: error,
        cwd,
      };
      if (this.opts.loose && /Command ".+?" not found/i.test(error.stderr)) {
        result.skipped = true;
      } else {
        result.error = new RunScriptError(
          `Script "${script}" in package "${pkgName}" failed`,
          script,
          pkgName,
          this.name,
          {error, exitCode: error.exitCode, output: error.stderr},
        );
      }
    }

    if (!result.error && !result.skipped && result.rawResult.failed) {
      let message: string;
      if (
        result.rawResult.stderr &&
        /Command ".+?" not found/i.test(result.rawResult.stderr)
      ) {
        message = `(runScript) Script "${script}" in package "${pkgName}" failed; script not found`;
      } else {
        if (result.rawResult.exitCode) {
          message = `(runScript) Script "${script}" in package "${pkgName}" failed with exit code ${result.rawResult.exitCode}: ${result.rawResult.all}`;
        } else {
          message = `(runScript) Script "${script}" in package "${pkgName}" failed: ${result.rawResult.all}`;
        }
      }
      result.error = new RunScriptError(message, script, pkgName, this.name, {
        exitCode: result.rawResult.exitCode,
        output: result.rawResult.all,
      });
    }

    if (result.error) {
      this.debug(
        `(runScripts) Script "%s" in package "%s" failed; continuing...`,
        script,
        pkgName,
      );
    } else {
      this.debug(
        '(runScripts) Successfully executed script %s in package %s',
        script,
        pkgName,
      );
    }

    return result;
  }
}

export default YarnClassic satisfies PackageManagerModule;
