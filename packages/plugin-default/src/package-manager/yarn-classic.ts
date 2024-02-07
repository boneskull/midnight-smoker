import Debug from 'debug';
import {ExecError, InstallError, PackError} from 'midnight-smoker/error';
import {type ExecResult, type Executor} from 'midnight-smoker/executor';
import {
  type InstallManifest,
  type PackOptions,
  type PkgManager,
  type PkgManagerDef,
  type PkgManagerOpts,
  type PkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import type {PluginHelpers} from 'midnight-smoker/plugin';
import {
  RunScriptError,
  ScriptFailedError,
  type RunScriptManifest,
  type RunScriptResult,
} from 'midnight-smoker/script-runner';
import path from 'node:path';

interface WorkspaceInfo {
  location: string;

  [key: string]: any;
}

export class YarnClassic implements PkgManager {
  protected readonly debug: Debug.Debugger;

  public static readonly bin = 'yarn';

  public readonly name = 'yarn';

  public static readonly lockfile = 'yarn.lock';

  constructor(
    public readonly spec: PkgManagerSpec,
    protected readonly executor: Executor,
    public readonly tmpdir: string,
    protected readonly helpers: PluginHelpers,
    protected readonly opts: PkgManagerOpts = {},
  ) {
    this.debug = Debug(`midnight-smoker:pm:yarn1`);
  }

  public static accepts = '^1.0.0';

  public static async create(
    this: void,
    spec: PkgManagerSpec,
    executor: Executor,
    helpers: PluginHelpers,
    opts?: PkgManagerOpts,
  ) {
    const tmpdir = await helpers.createTempDir();
    return new YarnClassic(spec, executor, tmpdir, helpers, opts);
  }

  public async install(
    installManifests: InstallManifest[],
  ): Promise<ExecResult> {
    if (!installManifests.length) {
      throw new TypeError('installManifests must be a non-empty array');
    }

    const installSpecs = installManifests.map(({spec}) => spec);
    const installArgs = ['add', '--no-lockfile', '--force', ...installSpecs];

    let installResult: ExecResult;
    try {
      installResult = await this.executor(
        this.spec,
        installArgs,
        {},
        {
          cwd: this.tmpdir,
        },
      );
    } catch (err) {
      if (err instanceof ExecError) {
        throw new InstallError(
          err.message,
          `${this.spec}`,
          installSpecs,
          this.tmpdir,
          {
            error: err,
            exitCode: err.exitCode,
            output: err.all || err.stderr || err.stdout,
          },
        );
      }
      throw err;
    }

    return installResult;
  }

  public async pack(opts: PackOptions = {}): Promise<InstallManifest[]> {
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
      } catch (err) {
        if (err instanceof ExecError) {
          throw new PackError(
            'Unable to read workspace information',
            `${this.spec}`,
            this.tmpdir,
            {
              error: err,
              exitCode: err.exitCode,
              output: err.all || err.stderr || err.stdout,
            },
          );
        }
        throw err;
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
                throw new PackError(
                  `Unable to find workspace "${workspace}`,
                  `${this.spec}`,
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

    const installManifests: InstallManifest[] = [];

    for await (const {command, cwd, tarball, pkgName} of commands) {
      try {
        await this.executor(this.spec, command, {}, {cwd});
      } catch (err) {
        if (err instanceof ExecError) {
          throw new PackError(err.message, `${this.spec}`, this.tmpdir, {
            error: err,
            exitCode: err.exitCode,
            output: err.all || err.stderr || err.stdout,
          });
        }
        throw err;
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
    manifest: RunScriptManifest,
  ): Promise<RunScriptResult> {
    const {script, pkgName, cwd} = manifest;
    const args = ['run', script];
    let result: RunScriptResult;
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
      if (err instanceof ExecError) {
        result = {
          pkgName,
          script,
          rawResult: err,
          cwd,
        };
        if (this.opts.loose && /Command ".+?" not found/i.test(err.stderr)) {
          result.skipped = true;
        } else {
          result.error = new RunScriptError(
            err,
            script,
            pkgName,
            `${this.spec}`,
          );
        }
      } else {
        throw err;
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

      result.error = new ScriptFailedError(message, {
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

export default YarnClassic satisfies PkgManagerDef;
