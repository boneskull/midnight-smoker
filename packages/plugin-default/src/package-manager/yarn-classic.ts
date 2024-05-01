import Debug from 'debug';
import {
  ExecError,
  InstallError,
  RunScriptError,
  ScriptFailedError,
  UnknownScriptError,
  Util,
  normalizeVersion,
  type ExecResult,
  type InstallManifest,
  type PkgManagerDef,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  type RunScriptResult,
  type ScriptError,
} from 'midnight-smoker/pkg-manager';
import {Range} from 'semver';
import {yarnVersionData} from './data';

interface WorkspaceInfo {
  location: string;

  [key: string]: any;
}

export class YarnClassic implements PkgManagerDef {
  protected debug = Debug(`midnight-smoker:pm:yarn1`);

  public readonly bin = 'yarn';

  public readonly lockfile = 'yarn.lock';

  public readonly supportedVersionRange = new Range('^1.0.0');

  public readonly name = 'yarn';

  public accepts(value: string) {
    const version = normalizeVersion(yarnVersionData, value);
    if (version && this.supportedVersionRange.test(version)) {
      return version;
    }
  }

  public async install(ctx: PkgManagerInstallContext): Promise<ExecResult> {
    const {installManifest, executor, spec, tmpdir} = ctx;

    const {pkgSpec} = installManifest;

    const installArgs = ['add', '--no-lockfile', '--force', pkgSpec];

    let installResult: ExecResult;
    try {
      installResult = await executor(
        spec,
        installArgs,
        {},
        {
          cwd: tmpdir,
        },
      );
    } catch (err) {
      if (Util.isSmokerError(ExecError, err)) {
        throw new InstallError(err.message, `${spec}`, pkgSpec, tmpdir, {
          error: err,
          exitCode: err.exitCode,
          output: err.all || err.stderr || err.stdout,
        });
      }
      throw err;
    }

    return installResult;
  }

  // @ts-expect-error messed up
  public async pack(ctx: PkgManagerPackContext): Promise<InstallManifest[]> {
    // interface PackCommand {
    //   command: string[];
    //   cwd: string;
    //   tarball: string;
    //   pkgName: string;
    // }
    // const {
    //   tmpdir,
    //   allWorkspaces,
    //   executor,
    //   workspaces,
    //   includeWorkspaceRoot,
    //   spec,
    // } = ctx;
    // const seenSlugs = new Set();
    // const computeSlug = (info: WorkspaceInfo) => {
    //   let slug = path.basename(info.location);
    //   for (let i = 0; i++; seenSlugs.has(slug)) {
    //     slug = `${slug}-${i}`;
    //   }
    //   seenSlugs.add(slug);
    //   return slug;
    // };
    // const finalizePackCommand = (
    //   info: WorkspaceInfo,
    //   pkgName: string,
    // ): PackCommand => {
    //   const slug = computeSlug(info);
    //   const tarball = path.join(tmpdir, `${slug}.tgz`);
    //   const cwd = path.isAbsolute(info.location)
    //     ? info.location
    //     : path.join(process.cwd(), info.location);
    //   return {
    //     command: [...basePackArgs, `--filename=${tarball}`],
    //     cwd,
    //     tarball,
    //     pkgName,
    //   };
    // };
    // const getWorkspaceRootPackageName = async () => {
    //   const {packageJson} = await Util.readPackageJson({
    //     cwd: process.cwd(),
    //     strict: true,
    //   });
    //   const {name = path.dirname(process.cwd())} = packageJson;
    //   return name;
    // };
    // const commands: PackCommand[] = [];
    // const basePackArgs = ['pack', '--json'];
    // const shouldUseWorkspaces = Boolean(allWorkspaces || workspaces?.length);
    // if (shouldUseWorkspaces) {
    //   let workspaceInfo: Record<string, WorkspaceInfo>;
    //   try {
    //     let {stdout} = await executor(spec, ['workspaces', 'info'], {}, {});
    //     const lines = stdout.split(/\r?\n/);
    //     lines.shift();
    //     lines.pop();
    //     stdout = lines.join('\n');
    //     workspaceInfo = JSON.parse(stdout) as Record<string, WorkspaceInfo>;
    //   } catch (err) {
    //     if (err instanceof ExecError) {
    //       throw new PackError(
    //         'Unable to read workspace information',
    //         `${spec}`,
    //         tmpdir,
    //         {
    //           error: err,
    //           exitCode: err.exitCode,
    //           output: err.all || err.stderr || err.stdout,
    //         },
    //       );
    //     }
    //     throw err;
    //   }
    //   if (workspaces?.length) {
    //     commands.push(
    //       ...workspaces.map((workspace) => {
    //         let info = workspaceInfo[workspace] as WorkspaceInfo | undefined;
    //         let name: string;
    //         if (!info) {
    //           [name, info] = Object.entries(workspaceInfo).find(
    //             ([, info]) => info.location === workspace,
    //           );
    //           if (!info) {
    //             throw new PackError(
    //               `Unable to find workspace "${workspace}`,
    //               `${spec}`,
    //               tmpdir,
    //             );
    //           }
    //         } else {
    //           name = workspace;
    //         }
    //         return finalizePackCommand(info, name);
    //       }),
    //     );
    //   } else {
    //     // allWorkspaces must be true
    //     commands.push(
    //       ...Object.entries(workspaceInfo).map(([name, info]) =>
    //         finalizePackCommand(info, name),
    //       ),
    //     );
    //     if (includeWorkspaceRoot) {
    //       commands.push(
    //         finalizePackCommand(
    //           {location: process.cwd()},
    //           await getWorkspaceRootPackageName(),
    //         ),
    //       );
    //     }
    //   }
    // } else {
    //   commands.push(
    //     finalizePackCommand(
    //       {location: process.cwd()},
    //       await getWorkspaceRootPackageName(),
    //     ),
    //   );
    // }
    // this.debug(commands);
    // const installManifests: InstallManifest[] = [];
    // for await (const {command, cwd, tarball, pkgName} of commands) {
    //   try {
    //     await executor(spec, command, {}, {cwd});
    //   } catch (err) {
    //     if (err instanceof ExecError) {
    //       throw new PackError(err.message, `${spec}`, tmpdir, {
    //         error: err,
    //         exitCode: err.exitCode,
    //         output: err.all || err.stderr || err.stdout,
    //       });
    //     }
    //     throw err;
    //   }
    //   installManifests.push({
    //     pkgSpec: tarball,
    //     cwd: tmpdir,
    //     installPath: path.join(tmpdir, 'node_modules', pkgName),
    //     pkgName,
    //   });
    // }
    // this.debug('(pack) Packed %d packages', installManifests.length);
    // return installManifests;
  }

  /**
   * Runs a script using the package manager executor.
   *
   * @param ctx - The context object containing information about the script
   *   execution.
   * @param isScriptNotFound - A function that checks executor output for a
   *   missing script, and returns `true` if the script is missing
   * @returns A `RunScriptResult` object containing the raw result, error, and
   *   skipped status.
   */
  protected async _runScript(
    ctx: PkgManagerRunScriptContext,
    isScriptNotFound: (value: string) => boolean,
  ) {
    const {executor, spec, runScriptManifest, loose} = ctx;
    const {script, pkgName, cwd} = runScriptManifest;
    let rawResult: ExecResult | undefined;
    let error: ScriptError | undefined;
    let skipped = false;
    try {
      rawResult = await executor(spec, ['run', script], {}, {cwd});
    } catch (err) {
      if (Util.isSmokerError(ExecError, err)) {
        if (loose && isScriptNotFound(err.stderr)) {
          skipped = true;
        } else {
          error = new RunScriptError(err, script, pkgName, `${spec}`);
        }
      } else {
        throw err;
      }
    }

    if (rawResult) {
      if (rawResult.failed) {
        if (loose && /Command ".+?" not found/i.test(rawResult.stderr)) {
          skipped = true;
        } else {
          error = new UnknownScriptError(
            `Script "${script}" in package "${pkgName}" not found`,
            script,
            pkgName,
          );
        }
      } else {
        let message: string;
        if (rawResult.exitCode) {
          message = `Script "${script}" in package "${pkgName}" failed with exit code ${rawResult.exitCode}: ${rawResult.all}`;
        } else {
          message = `Script "${script}" in package "${pkgName}" failed: ${rawResult.all}`;
        }
        error = new ScriptFailedError(message, {
          script,
          pkgName,
          pkgManager: this.name,
          exitCode: rawResult.exitCode,
          output: rawResult.all || rawResult.stderr || rawResult.stdout,
          command: rawResult.command,
        });
      }
    }

    const result: RunScriptResult = {rawResult, error, skipped};

    if (result.error) {
      this.debug(
        `Script "%s" in package "%s" failed; continuing...`,
        script,
        pkgName,
      );
    } else if (result.skipped) {
      this.debug(
        'Skipped script %s in package %s; script not found',
        script,
        pkgName,
      );
    } else {
      this.debug(
        'Successfully executed script %s in package %s',
        script,
        pkgName,
      );
    }

    return result;
  }

  public async runScript(
    ctx: PkgManagerRunScriptContext,
  ): Promise<RunScriptResult> {
    return this._runScript(ctx, (value) =>
      /Command ".+?" not found/i.test(value),
    );
  }
}

export default YarnClassic;
