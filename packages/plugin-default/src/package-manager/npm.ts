import type Debug from 'debug';
import {pickBy} from 'lodash';
import {InstallError, InvalidArgError} from 'midnight-smoker/error';
import {
  ExecError,
  type ExecResult,
  type Executor,
} from 'midnight-smoker/executor';
import {
  type InstallManifest,
  type PackOptions,
  type PkgManager,
  type PkgManagerOpts,
  type PkgManagerRunScriptFnOpts,
  type PkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import {
  RunScriptError,
  ScriptFailedError,
  UnknownScriptError,
  type RunScriptManifest,
  type RunScriptResult,
} from 'midnight-smoker/script-runner';
import {isSmokerError} from 'midnight-smoker/util';

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
export abstract class GenericNpmPackageManager implements PkgManager {
  protected abstract debug: Debug.Debugger;

  public static readonly lockfile = 'package-lock.json';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public static accepts(value: string) {}

  /**
   * @param spec - Package manager name and version
   * @param executor - Executor instance
   * @param tmpdir - Temporary directory
   * @param opts - Extra options
   */
  public constructor(
    public readonly spec: PkgManagerSpec,
    protected readonly executor: Executor,
    public readonly tmpdir: string,
    protected readonly opts: PkgManagerOpts = {},
  ) {}

  public abstract install(
    installManifest: InstallManifest[],
  ): Promise<ExecResult>;

  public abstract pack(opts?: PackOptions): Promise<InstallManifest[]>;

  public async runScript(
    manifest: RunScriptManifest,
    opts: PkgManagerRunScriptFnOpts = {},
  ): Promise<RunScriptResult> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!manifest) {
      throw new InvalidArgError(
        'manifest must be a valid RunScriptManifest object',
        {argName: 'manifest'},
      );
    }
    const {script, pkgName, cwd} = manifest;
    const {signal} = opts;
    let result: RunScriptResult;
    try {
      const rawResult = await this.executor(
        this.spec,
        ['run', '--json', script],
        {signal},
        {cwd},
      );
      result = {pkgName, script, rawResult, cwd};
    } catch (e) {
      const err = e as ExecError;
      if (err?.id === 'ExecError') {
        result = {
          pkgName,
          script,
          rawResult: err,
          cwd,
        };
        if (this.opts.loose && /missing script:/i.test(err.stderr)) {
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
      if (
        result.rawResult.stderr &&
        /missing script:/i.test(result.rawResult.stderr)
      ) {
        if (!this.opts.loose) {
          result.error = new UnknownScriptError(
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
        result.error = new ScriptFailedError(message, {
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
  protected async _install(
    installManifests: InstallManifest[],
    args: string[],
  ): Promise<ExecResult> {
    if (!installManifests.length) {
      throw new InvalidArgError('installManifests must be a non-empty array', {
        argName: 'installManifests',
      });
    }

    const installSpecs = installManifests.map(({spec}) => spec);
    let err: InstallError | undefined;
    const installArgs = ['install', ...args, ...installSpecs];

    let installResult: ExecResult;
    try {
      installResult = await this.executor(
        this.spec,
        installArgs,
        {},
        {cwd: this.tmpdir},
      );
      err = this.handleInstallError(installResult, installSpecs);
    } catch (e) {
      if (isSmokerError(ExecError, e)) {
        err = this.handleInstallError(e, installSpecs);
      } else {
        throw e;
      }
    }
    if (err) {
      throw err;
    }
    this.debug('(install) Installed %d packages', installSpecs.length);
    return installResult!;
  }

  protected handleInstallError(
    errOrResult: ExecError | ExecResult,
    installSpecs: string[],
  ): InstallError | undefined {
    if (isSmokerError(ExecError, errOrResult)) {
      try {
        const parsedError = this.parseNpmError(errOrResult.stdout);
        return new InstallError(
          parsedError.summary,
          `${this.spec}`,
          installSpecs,
          this.tmpdir,
          {
            error: parsedError,
            output: errOrResult.all || errOrResult.stderr || errOrResult.stdout,
            exitCode: errOrResult.exitCode,
          },
          errOrResult,
        );
      } catch (e) {
        return new InstallError(
          `Unable to parse npm output. Use --verbose for more information`,
          `${this.spec}`,
          installSpecs,
          this.tmpdir,
          {
            output: errOrResult.all || errOrResult.stderr || errOrResult.stdout,
            exitCode: errOrResult.exitCode,
          },
          errOrResult,
        );
      }
    } else if (errOrResult.exitCode > 0 || errOrResult instanceof Error) {
      return new InstallError(
        `Use --verbose for more information`,
        `${this.spec}`,
        installSpecs,
        this.tmpdir,
        {
          output: errOrResult.all || errOrResult.stderr || errOrResult.stdout,
          exitCode: errOrResult.exitCode,
        },
      );
    }
  }

  /**
   * When run with `--json`, `npm` will output an error a JSON blob on `stdout`
   * when it fails. Extract whatever we can from it.
   *
   * @param json - JSON string to parse (typically `stdout` of a child process)
   * @returns Parsed error object, or `undefined` if parsing failed
   */
  parseNpmError(json: string): NpmJsonOutput['error'] {
    const parsed = JSON.parse(json) as NpmJsonOutput;
    // trim falsy values, which seems to happen a lot.
    return pickBy(parsed.error, Boolean) as NpmJsonOutput['error'];
  }
}
