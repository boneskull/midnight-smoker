import {isError, pickBy} from 'lodash';
import {ERROR, FAILED, OK, SKIPPED} from 'midnight-smoker/constants';
import {
  type ExecError,
  type ExecResult,
  InstallError,
  type InstallManifest,
  PackError,
  PackParseError,
  type PkgManager,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  RunScriptError,
  type RunScriptResult,
  ScriptFailedError,
  UnknownScriptError,
  type WorkspaceInfo,
} from 'midnight-smoker/pkg-manager';
import {fromUnknownError} from 'midnight-smoker/util';
import path from 'node:path';

import {createDebug} from '../debug';
import {isExecError} from './util';

/**
 * When `npm` fails when run with `--json`, the error output is also in JSON.
 *
 * This is the minimal declaration of that output for our purposes.
 */
interface NpmJsonOutput {
  error: {
    code?: null | string;
    detail?: string;
    summary: string;
  };
}

/**
 * JSON output of `npm pack`
 *
 * Actual object contains more fields.
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
interface NpmPackItemFileEntry {
  /**
   * Path of file
   */
  path: string;
}

/**
 * Extracts an {@link InstallError} from an {@link ExecError} thrown when `npm`
 * failed to install something.
 *
 * @param ctx Installation context
 * @param error Execution error
 * @param pkgSpec Package spec
 * @returns An {@link InstallError} instance
 */
function maybeHandleInstallError(
  {spec, tmpdir}: PkgManagerInstallContext,
  error: ExecError,
  pkgSpec: string,
): InstallError;

/**
 * _Might_ extract an {@link InstallError} from an {@link ExecResult} thrown when
 * `npm` failed to install something.
 *
 * @param ctx Installation context
 * @param result Execution result
 * @param pkgSpec Package spec
 * @returns An {@link InstallError} instance, or `undefined` if there was no
 *   error
 */
function maybeHandleInstallError(
  {spec, tmpdir}: PkgManagerInstallContext,
  result: ExecResult,
  pkgSpec: string,
): InstallError | undefined;
function maybeHandleInstallError(
  {spec, tmpdir}: PkgManagerInstallContext,
  errOrResult: ExecError | ExecResult,
  pkgSpec: string,
): InstallError | undefined {
  if (isExecError(errOrResult)) {
    try {
      const parsedError = parseNpmError(errOrResult.stdout);
      return new InstallError(
        parsedError.summary,
        spec,
        pkgSpec,
        tmpdir,
        errOrResult,
      );
    } catch (e) {
      return new InstallError(
        `Unable to parse npm output. Use --verbose for more information`,
        spec,
        pkgSpec,
        tmpdir,
        errOrResult,
      );
    }
  } else if (errOrResult.exitCode > 0 || isError(errOrResult)) {
    return new InstallError(
      `Use --verbose for more information`,
      spec,
      pkgSpec,
      tmpdir,
      errOrResult,
    );
  }
}

/**
 * Installs a package using `npm`.
 *
 * This function can be used by specific implementations of npm package managers
 *
 * @param ctx Installation context
 * @param args Command arguments
 * @returns Result of the installation as an {@link ExecResult}
 */
export async function install(
  ctx: PkgManagerInstallContext,
  args: string[],
): Promise<ExecResult> {
  const {executor, installManifest, spec, tmpdir} = ctx;
  const {isAdditional, pkgName, pkgSpec} = installManifest;

  let err: InstallError | undefined;
  const installArgs = ['install', pkgSpec, ...args];

  let installResult: ExecResult;
  try {
    installResult = await executor(spec, installArgs, {}, {cwd: tmpdir});
    err = maybeHandleInstallError(ctx, installResult, pkgSpec);
  } catch (e) {
    if (isExecError(e)) {
      throw maybeHandleInstallError(ctx, e, pkgSpec);
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
}

/**
 * Parse JSON output of `npm` when it fails.
 *
 * When run with `--json`, `npm` will output an error as JSON blob on `stdout`
 * when it fails. We don't care about anything other than the error message.
 *
 * @param json - JSON string to parse (typically `stdout` of a child process)
 * @returns Parsed error object, or `undefined` if parsing failed
 */
function parseNpmError(json: string): NpmJsonOutput['error'] {
  const parsed = JSON.parse(json) as NpmJsonOutput;
  // trim falsy values, which seems to happen a lot.
  return pickBy(parsed.error, Boolean) as NpmJsonOutput['error'];
}

const debug = createDebug(__filename);

/**
 * If a script is missing, `npm` will output something like this.
 *
 * The capitalization seems to be version-dependent
 */
const MISSING_SCRIPT_REGEX = /missing\sscript:/i;

/**
 * This is an incomplete implementation of a `PkgManager` for `npm`. It
 * functions as namespace for common behaviors which actual implementations can
 * use.
 */
export const BaseNpmPackageManager = Object.freeze({
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

    let packResult: ExecResult;

    const workspace = {
      localPath: ctx.localPath,
      pkgName: ctx.pkgName,
    } as WorkspaceInfo;

    try {
      packResult = await ctx.executor(ctx.spec, packArgs);
    } catch (err) {
      debug('(pack) Failed: %O', err);
      if (isExecError(err)) {
        // in some cases we can get something more user-friendly via the JSON output
        const parsedError = parseNpmError(err.stdout);

        if (parsedError) {
          throw new PackError(
            parsedError.summary,
            ctx.spec,
            workspace,
            ctx.tmpdir,
            {
              error: parsedError,
              exitCode: err.exitCode,
              output: err.stderr,
            },
          );
        }

        throw new PackError(
          `Use --verbose for more information`,
          ctx.spec,
          workspace,
          ctx.tmpdir,
          {error: err},
        );
      }
      throw fromUnknownError(err);
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
            ctx.spec.label,
            workspace,
            err,
            packOutput,
          )
        : fromUnknownError(err);
    }

    const installManifest = parsed.map<InstallManifest>(({filename, name}) => {
      // workaround for https://github.com/npm/cli/issues/3405
      filename = filename.replace(/^@(.+?)\//, '$1-');

      return {
        cwd: ctx.tmpdir,
        installPath: path.join(ctx.tmpdir, 'node_modules', name),
        localPath: ctx.localPath,
        pkgName: name,
        pkgSpec: path.join(ctx.tmpdir, filename),
      };
    });

    return installManifest.shift()!;
  },

  async runScript({
    executor,
    loose,
    manifest,
    signal,
    spec,
  }: PkgManagerRunScriptContext): Promise<RunScriptResult> {
    const {cwd, pkgName, script} = manifest;

    let rawResult: ExecResult | undefined;
    let error: ScriptFailedError | undefined;

    const isMissingScript = (str: string) => MISSING_SCRIPT_REGEX.test(str);

    // we don't use --if-present because the output does not elide that the
    // script is missing
    try {
      rawResult = await executor(
        spec,
        ['run', '--json', script],
        {signal},
        {cwd},
      );
    } catch (err) {
      if (isExecError(err)) {
        if (isMissingScript(err.stderr)) {
          if (loose) {
            return {manifest, type: SKIPPED};
          }
          return {
            error: new UnknownScriptError(
              `Script "${script}" in package "${pkgName}" not found`,
              script,
              pkgName,
            ),
            manifest,
            type: ERROR,
          };
        }
        return {
          error: new RunScriptError(err, script, pkgName, spec.label),
          manifest,
          type: ERROR,
        };
      }
      throw fromUnknownError(err);
    }

    if (rawResult.failed) {
      if (isMissingScript(rawResult.stderr)) {
        return loose
          ? {
              manifest,
              type: SKIPPED,
            }
          : {
              error: new UnknownScriptError(
                `Script "${script}" in package "${pkgName}" not found`,
                script,
                pkgName,
              ),
              manifest,
              rawResult,
              type: ERROR,
            };
      }

      const {all, command, exitCode, stderr, stdout} = rawResult;
      const message = exitCode
        ? `Script "${script}" in package "${pkgName}" failed with exit code ${exitCode}`
        : `Script "${script}" in package "${pkgName}" failed`;
      error = new ScriptFailedError(message, {
        command,
        exitCode,
        output: all || stderr || stdout,
        pkgManager: spec.label,
        pkgName,
        script,
      });
    }

    debug('(runScript): Ran script "%s" in package "%s"', script, pkgName);

    return error
      ? {error, manifest, rawResult, type: FAILED}
      : {manifest, rawResult, type: OK};
  },
} as const) satisfies Partial<PkgManager>;
