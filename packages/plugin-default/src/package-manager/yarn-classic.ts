import Debug from 'debug';
import type {
  ScriptRunner,
  type Executor,
  type Helpers,
  type PkgManager,
} from 'midnight-smoker/plugin';
import {Errors} from 'midnight-smoker/plugin';
import path from 'node:path';
import type {SemVer} from 'semver';

interface WorkspaceInfo {
  location: string;

  [key: string]: any;
}

export class YarnClassic implements PkgManager.PackageManager {
  protected readonly debug: Debug.Debugger;

  public static readonly bin = 'yarn';

  public readonly name = 'yarn';

  constructor(
    public readonly spec: string,
    protected readonly executor: Executor.Executor,
    public readonly tmpdir: string,
    protected readonly helpers: typeof Helpers,
    protected readonly opts: PkgManager.PackageManagerOpts = {},
  ) {
    this.debug = Debug(`midnight-smoker:pm:yarn1`);
  }

  public static accepts(semver: SemVer) {
    return Boolean(semver.compare('1.0.0') - semver.compare('2.0.0'));
  }

  public static async create(
    this: void,
    id: string,
    executor: Executor.Executor,
    helpers: typeof Helpers,
    opts?: PkgManager.PackageManagerOpts,
  ) {
    const tmpdir = await helpers.createTempDir();
    return new YarnClassic(id, executor, tmpdir, helpers, opts);
  }

  public async install(
    installManifests: PkgManager.InstallManifest[],
  ): Promise<Executor.ExecResult> {
    if (!installManifests.length) {
      throw new TypeError('installManifests must be a non-empty array');
    }

    const installSpecs = installManifests.map(({spec}) => spec);
    const installArgs = ['add', '--no-lockfile', '--force', ...installSpecs];

    let installResult: Executor.ExecResult;
    try {
      installResult = await this.executor(
        this.spec,
        installArgs,
        {},
        {
          cwd: this.tmpdir,
        },
      );
    } catch (e) {
      const err = e as Executor.ExecError;
      throw new Errors.InstallError(
        err.message,
        this.spec,
        installSpecs,
        this.tmpdir,
        {
          error: err,
          exitCode: err.exitCode,
          output: err.all || err.stderr || err.stdout,
        },
      );
    }

    this.debug('(install) Installed %d packages', installManifests.length);

    return installResult;
  }

  public async pack(
    opts: PkgManager.PackOptions = {},
  ): Promise<PkgManager.InstallManifest[]> {
    interface PackCommand {
      command: string[];
      cwd: string;
      tarball: string;
      pkgName: string;
    }

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
      const tarball = path.join(this.tmpdir, `${slug}.tgz`);
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
      const {packageJson} = await this.helpers.readPackageJson({
        cwd: process.cwd(),
        strict: true,
      });
      const {name = path.dirname(process.cwd())} = packageJson;
      return name;
    };

    const commands: PackCommand[] = [];

    const basePackArgs = ['pack', '--json'];

    const shouldUseWorkspaces = Boolean(
      opts.allWorkspaces || opts.workspaces?.length,
    );

    if (shouldUseWorkspaces) {
      let workspaceInfo: Record<string, WorkspaceInfo>;
      try {
        let {stdout} = await this.executor(
          this.spec,
          ['workspaces', 'info'],
          {},
          {},
        );
        const lines = stdout.split(/\r?\n/);
        lines.shift();
        lines.pop();
        stdout = lines.join('\n');
        workspaceInfo = JSON.parse(stdout) as Record<string, WorkspaceInfo>;
      } catch (e) {
        const err = e as Executor.ExecError;
        throw new Errors.PackError(
          'Unable to read workspace information',
          this.spec,
          this.tmpdir,
          {
            error: err,
            exitCode: err.exitCode,
            output: err.all || err.stderr || err.stdout,
          },
        );
      }

      if (opts.workspaces?.length) {
        commands.push(
          ...opts.workspaces.map((workspace) => {
            let info = workspaceInfo[workspace] as WorkspaceInfo | undefined;
            let name: string;
            if (!info) {
              [name, info] = Object.entries(workspaceInfo).find(
                ([, info]) => info.location === workspace,
              );
              if (!info) {
                throw new Errors.PackError(
                  `Unable to find workspace "${workspace}`,
                  this.spec,
                  this.tmpdir,
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

    const installManifests: PkgManager.InstallManifest[] = [];

    for await (const {command, cwd, tarball, pkgName} of commands) {
      try {
        await this.executor(this.spec, command, {}, {cwd});
      } catch (e) {
        const err = e as Executor.ExecError;
        throw new Errors.PackError(err.message, this.spec, this.tmpdir, {
          error: err,
          exitCode: err.exitCode,
          output: err.all || err.stderr || err.stdout,
        });
      }
      installManifests.push({
        spec: tarball,
        cwd: this.tmpdir,
        installPath: path.join(this.tmpdir, 'node_modules', pkgName),
        pkgName,
      });
    }

    this.debug('(pack) Packed %d packages', installManifests.length);

    return installManifests;
  }

  public async runScript(
    manifest: ScriptRunner.RunScriptManifest,
  ): Promise<ScriptRunner.RunScriptResult> {
    const {script, pkgName, cwd} = manifest;
    const args = ['run', script];
    let result: ScriptRunner.RunScriptResult;
    try {
      const rawResult = await this.executor(
        this.spec,
        args,
        {},
        {
          cwd,
        },
      );
      result = {pkgName, script, rawResult, cwd};
    } catch (err) {
      const error = err as Errors.ExecError;
      result = {
        pkgName,
        script,
        rawResult: error,
        cwd,
      };
      if (this.opts.loose && /Command ".+?" not found/i.test(error.stderr)) {
        result.skipped = true;
      } else {
        result.error = new Errors.RunScriptError(
          error,
          script,
          pkgName,
          this.spec,
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

      result.error = new Errors.ScriptFailedError(message, {
        script,
        pkgName,
        pkgManager: this.name,
        exitCode: result.rawResult.exitCode,
        output:
          result.rawResult.all ||
          result.rawResult.stderr ||
          result.rawResult.stdout,
        command: result.rawResult.command,
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

export default YarnClassic satisfies PkgManager.PackageManagerModule;
