import Debug from 'debug';
import {isError, pickBy} from 'lodash';
import {fromUnknownError} from 'midnight-smoker/error';
import {
  ExecError,
  InstallError,
  PackError,
  PackParseError,
  RunScriptError,
  ScriptFailedError,
  UnknownScriptError,
  type ExecResult,
  type InstallManifest,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  type RunScriptResult,
  type ScriptError,
} from 'midnight-smoker/pkg-manager';
import {isSmokerError} from 'midnight-smoker/util';
import path from 'node:path';

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

const debug = Debug('midnight-smoker:pkg-manager:base-npm');

/**
 * When run with `--json`, `npm` will output an error a JSON blob on `stdout`
 * when it fails. Extract whatever we can from it.
 *
 * @param json - JSON string to parse (typically `stdout` of a child process)
 * @returns Parsed error object, or `undefined` if parsing failed
 */
export function parseNpmError(json: string): NpmJsonOutput['error'] {
  const parsed = JSON.parse(json) as NpmJsonOutput;
  // trim falsy values, which seems to happen a lot.
  return pickBy(parsed.error, Boolean) as NpmJsonOutput['error'];
}

export function handleInstallError(
  {tmpdir, spec}: PkgManagerInstallContext,
  errOrResult: ExecError,
  pkgSpec: string,
): InstallError;

export function handleInstallError(
  {tmpdir, spec}: PkgManagerInstallContext,
  errOrResult: ExecResult,
  pkgSpec: string,
): InstallError | undefined;

export function handleInstallError(
  {tmpdir, spec}: PkgManagerInstallContext,
  errOrResult: ExecError | ExecResult,
  pkgSpec: string,
): InstallError | undefined {
  if (isSmokerError(ExecError, errOrResult)) {
    try {
      const parsedError = parseNpmError(errOrResult.stdout);
      return new InstallError(
        parsedError.summary,
        `${spec}`,
        pkgSpec,
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
        pkgSpec,
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
      pkgSpec,
      tmpdir,
      {
        output: errOrResult.all || errOrResult.stderr || errOrResult.stdout,
        exitCode: errOrResult.exitCode,
      },
    );
  }
}

export const BaseNpmPackageManager = {
  bin: 'npm',

  lockfile: 'package-lock.json',

  async pack(ctx: PkgManagerPackContext): Promise<InstallManifest> {
    const packArgs = [
      'pack',
      '--json',
      `--pack-destination=${ctx.tmpdir}`,
      '--foreground-scripts=false', // suppress output of lifecycle scripts so json can be parsed
    ];

    if (ctx.useWorkspaces) {
      packArgs.push('-w', ctx.localPath);
    }
    // if (ctx.workspaces?.length) {
    //   packArgs = [
    //     ...packArgs,
    //     ...ctx.workspaces.map((w) => `--workspace=${w}`),
    //   ];
    // } else if (ctx.allWorkspaces) {
    //   packArgs = [...packArgs, '--workspaces'];
    //   if (ctx.includeWorkspaceRoot) {
    //     packArgs = [...packArgs, '--include-workspace-root'];
    //   }
    // }

    let packResult: ExecResult;

    try {
      packResult = await ctx.executor(ctx.spec, packArgs);
    } catch (e) {
      debug('(pack) Failed: %O', e);
      const err = e as ExecError;
      if (err.id === 'ExecError') {
        // in some cases we can get something more user-friendly via the JSON output
        const parsedError = parseNpmError(err.stdout);

        if (parsedError) {
          throw new PackError(parsedError.summary, `${ctx.spec}`, ctx.tmpdir, {
            error: parsedError,
            output: err.stderr,
            exitCode: err.exitCode,
          });
        }

        throw new PackError(
          `Use --verbose for more information`,
          `${ctx.spec}`,
          ctx.tmpdir,
          {error: err},
        );
      }
      throw e;
    }

    let parsed: NpmPackItem[];

    const {stdout: packOutput} = packResult;
    try {
      parsed = JSON.parse(packOutput) as NpmPackItem[];
      debug('(pack) Packed ok');
    } catch (err) {
      debug('(pack) Failed to parse JSON: %s', packOutput);
      throw isError(err)
        ? new PackParseError(
            `Failed to parse JSON result of "npm pack"`,
            `${ctx.spec}`,
            err,
            packOutput,
          )
        : err;
    }

    const installManifest = parsed.map<InstallManifest>(({filename, name}) => {
      // workaround for https://github.com/npm/cli/issues/3405
      filename = filename.replace(/^@(.+?)\//, '$1-');

      return {
        localPath: ctx.localPath,
        pkgSpec: path.join(ctx.tmpdir, filename),
        installPath: path.join(ctx.tmpdir, 'node_modules', name),
        cwd: ctx.tmpdir,
        pkgName: name,
      };
    });
    debug('(pack) Packed %d packages', installManifest.length);

    return installManifest.shift()!;
  },

  async runScript({
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
    } catch (err) {
      if (isSmokerError(ExecError, err)) {
        if (loose && /missing script:/i.test(err.stderr)) {
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
        if (/missing script:/i.test(rawResult.stderr)) {
          if (loose) {
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
    }

    const result: RunScriptResult = {rawResult, error, skipped};

    if (result.error) {
      debug(
        `Script "%s" in package "%s" failed; continuing...`,
        script,
        pkgName,
      );
    } else if (result.skipped) {
      debug(
        'Skipped script %s in package %s; script not found',
        script,
        pkgName,
      );
    } else {
      debug('Successfully executed script %s in package %s', script, pkgName);
    }

    return result;
  },
  async _install(
    ctx: PkgManagerInstallContext,
    args: string[],
  ): Promise<ExecResult> {
    const {executor, installManifest, spec, tmpdir} = ctx;
    const {pkgSpec, pkgName, isAdditional} = installManifest;

    let err: InstallError | undefined;
    const installArgs = ['install', pkgSpec, ...args];

    let installResult: ExecResult;
    try {
      installResult = await executor(spec, installArgs, {}, {cwd: tmpdir});
      err = handleInstallError(ctx, installResult, pkgSpec);
    } catch (e) {
      if (isSmokerError(ExecError, e)) {
        throw handleInstallError(ctx, e, pkgSpec);
      }
      throw fromUnknownError(e);
    }
    if (err) {
      throw err;
    }

    if (isAdditional) {
      debug('Installed additional dep "%s"', pkgName);
    } else {
      debug('Installed package "%s" from tarball', pkgName);
    }
    return installResult;
  },
};
