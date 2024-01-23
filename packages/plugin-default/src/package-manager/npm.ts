import type Debug from 'debug';
import * as Errors from 'midnight-smoker/error';
import * as Executor from 'midnight-smoker/executor';
import * as PkgManager from 'midnight-smoker/pkg-manager';

/**
 * When `npm` fails when run with `--json`, the error output is also in JSON.
 *
 * This is the minimal declaration of that output for our purposes.
 */
export interface NpmJsonOutput {
  error: {
    summary: string;
    detail?: string;
    code?: null | string;
  };
}

/**
 * Type of item in the {@link NpmPackItem.files} array.
 *
 * Actual object contains more fields.
 *
 * @internal
 */

export interface NpmPackItemFileEntry {
  /**
   * Path of file
   */
  path: string;
}

/**
 * JSON output of `npm pack`
 *
 * Actual object contains more fields.
 *
 * @internal
 */
export interface NpmPackItem {
  /**
   * Filename of tarball
   */
  filename: string;
  /**
   * Files in the tarball
   */
  files: NpmPackItemFileEntry[];
  /**
   * Package name
   */
  name: string;
}

/**
 * Intended to provide whatever we can that's common to all versions of `npm`.
 */
export abstract class GenericNpmPackageManager
  implements PkgManager.PkgManager
{
  protected abstract debug: Debug.Debugger;
  protected readonly opts: PkgManager.PkgManagerOpts;
  public readonly spec: PkgManager.PkgManagerSpec;
  protected readonly executor: Executor.Executor;
  public readonly tmpdir: string;

  public static readonly lockfile = 'package-lock.json';

  /**
   * @param spec - Package manager name and version
   * @param executor - Executor instance
   * @param tmpdir - Temporary directory
   * @param opts - Extra options
   */
  public constructor(
    spec: PkgManager.PkgManagerSpec,
    executor: Executor.Executor,
    tmpdir: string,
    opts: PkgManager.PkgManagerOpts = {},
  ) {
    this.spec = spec;
    this.executor = executor;
    this.tmpdir = tmpdir;
    this.opts = opts;
  }

  public abstract install(
    installManifest: PkgManager.InstallManifest[],
  ): Promise<Executor.ExecResult>;

  public abstract pack(
    opts?: PkgManager.PackOptions,
  ): Promise<PkgManager.InstallManifest[]>;

  public async runScript(
    manifest: PkgManager.RunScriptManifest,
    opts: PkgManager.ScriptRunnerOpts = {},
  ): Promise<PkgManager.RunScriptResult> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!manifest) {
      throw new Errors.InvalidArgError(
        'manifest must be a valid RunScriptManifest object',
        {argName: 'manifest'},
      );
    }
    const {script, pkgName, cwd} = manifest;
    const {signal} = opts;
    let result: PkgManager.RunScriptResult;
    try {
      const rawResult = await this.executor(
        this.spec,
        ['run', '--json', script],
        {signal},
        {cwd},
      );
      result = {pkgName, script, rawResult, cwd};
    } catch (err) {
      if (err instanceof Executor.ExecError) {
        result = {
          pkgName,
          script,
          rawResult: err,
          cwd,
        };
        if (this.opts.loose && /missing script:/i.test(err.stderr)) {
          result.skipped = true;
        } else {
          result.error = new PkgManager.Errors.RunScriptError(
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
      if (
        result.rawResult.stderr &&
        /missing script:/i.test(result.rawResult.stderr)
      ) {
        if (!this.opts.loose) {
          result.error = new PkgManager.Errors.UnknownScriptError(
            `Script "${script}" in package "${pkgName}" not found`,
            script,
            pkgName,
          );
        } else {
          result.skipped = true;
        }
      } else {
        let message: string;
        const {exitCode, command, all, stderr, stdout} = result.rawResult;
        if (exitCode) {
          message = `Script "${script}" in package "${pkgName}" failed with exit code ${exitCode}`;
        } else {
          message = `Script "${script}" in package "${pkgName}" failed`;
        }
        result.error = new PkgManager.Errors.ScriptFailedError(message, {
          script,
          pkgName,
          pkgManager: `${this.spec}`,
          command,
          exitCode,
          output: all || stderr || stdout,
        });
      }
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

  /**
   * When run with `--json`, `npm` will output an error a JSON blob on `stdout`
   * when it fails. Extract whatever we can from it.
   *
   * @param json - JSON string to parse (typically `stdout` of a child process)
   * @returns Parsed error object, or `undefined` if parsing failed
   */
  parseNpmError(json: string): NpmJsonOutput['error'] | undefined {
    try {
      const parsed = JSON.parse(json) as NpmJsonOutput;
      // trim falsy values, which seems to happen a lot.
      return Object.fromEntries(
        Object.entries(parsed.error).filter(([, v]) => Boolean(v)),
      ) as NpmJsonOutput['error'];
    } catch {
      // ignore
    }
  }
}
