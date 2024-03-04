import type Debug from 'debug';
import {pickBy} from 'lodash';
import {type ScriptError} from 'midnight-smoker/error';
import {
  ExecError,
  InstallError,
  InvalidArgError,
  RunScriptError,
  ScriptFailedError,
  UnknownScriptError,
  type ExecResult,
  type InstallManifest,
  type PkgManagerAcceptsResult,
  type PkgManagerDef,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  type RunScriptResult,
} from 'midnight-smoker/pkg-manager';
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
export abstract class BaseNpmPackageManager implements PkgManagerDef {
  protected abstract debug: Debug.Debugger;

  public abstract accepts(value: string): PkgManagerAcceptsResult;

  public abstract install(ctx: PkgManagerInstallContext): Promise<ExecResult>;

  public abstract pack(ctx: PkgManagerPackContext): Promise<InstallManifest[]>;

  public readonly bin = 'npm';
  public readonly lockfile = 'package-lock.json';

  public async runScript({
    executor,
    loose,
    spec,
    runScriptManifest,
    signal,
  }: PkgManagerRunScriptContext): Promise<RunScriptResult> {
    const {script, pkgName, cwd} = runScriptManifest;

    let rawResult: ExecResult | undefined;
    let error: ScriptError | undefined;
    let skipped = false;
    try {
      rawResult = await executor(
        spec,
        ['run', '--json', script],
        {signal},
        {cwd},
      );
    } catch (e) {
      const err = e as ExecError;
      if (loose && /missing script:/i.test(err.stderr)) {
        skipped = true;
      } else {
        error = new RunScriptError(err, script, pkgName, `${spec}`);
      }
    }

    if (rawResult) {
      if (rawResult.failed) {
        if (loose && /missing script:/i.test(rawResult.stderr)) {
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
        const {exitCode, command, all, stderr, stdout} = rawResult;
        if (exitCode) {
          message = `Script "${script}" in package "${pkgName}" failed with exit code ${exitCode}`;
        } else {
          message = `Script "${script}" in package "${pkgName}" failed`;
        }
        error = new ScriptFailedError(message, {
          script,
          pkgName,
          pkgManager: `${spec}`,
          command,
          exitCode,
          output: all || stderr || stdout,
        });
      }
    }

    const result: RunScriptResult = {rawResult, error, skipped};

    if ('error' in result) {
      this.debug(
        `(runScripts) Script "%s" in package "%s" failed; continuing...`,
        script,
        pkgName,
      );
    } else if (result.skipped) {
      this.debug(
        '(runScripts) Skipped script %s in package %s; script not found',
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
    ctx: PkgManagerInstallContext,
    args: string[],
  ): Promise<ExecResult> {
    const {executor, installManifests, spec, tmpdir} = ctx;
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
      installResult = await executor(spec, installArgs, {}, {cwd: tmpdir});
      err = this.handleInstallError(ctx, installResult, installSpecs);
    } catch (e) {
      if (isSmokerError(ExecError, e)) {
        err = this.handleInstallError(ctx, e, installSpecs);
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
    {tmpdir, spec}: PkgManagerInstallContext,
    errOrResult: ExecError | ExecResult,
    installSpecs: string[],
  ): InstallError | undefined {
    if (isSmokerError(ExecError, errOrResult)) {
      try {
        const parsedError = this.parseNpmError(errOrResult.stdout);
        return new InstallError(
          parsedError.summary,
          `${spec}`,
          installSpecs,
          tmpdir,
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
          `${spec}`,
          installSpecs,
          tmpdir,
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
        `${spec}`,
        installSpecs,
        tmpdir,
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
