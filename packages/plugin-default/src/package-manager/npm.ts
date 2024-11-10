import {isError, pickBy} from 'lodash';
import {ERROR, FAILED, OK, SKIPPED} from 'midnight-smoker/constants';
import {
  type ExecError,
  type ExecOutput,
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
 * Installs a package using `npm`.
 *
 * This function can be used by specific implementations of npm package managers
 *
 * @param ctx Installation context
 * @param args Command arguments
 * @returns Result of the installation as an {@link ExecOutput}
 */
export async function install(
  ctx: PkgManagerInstallContext,
  args: string[],
): Promise<ExecOutput> {
  const {executor, installManifest, signal, spec, tmpdir} = ctx;
  const {isAdditional, pkgName, pkgSpec} = installManifest;

  let err: InstallError | undefined;
  const installArgs = ['install', pkgSpec, ...args];

  let installResult: ExecOutput;
  try {
    installResult = await executor(spec, installArgs, {
      nodeOptions: {cwd: tmpdir, signal},
      verbose: ctx.verbose,
    });
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
 * _Might_ extract an {@link InstallError} from an {@link ExecOutput} thrown when
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
  result: ExecOutput,
  pkgSpec: string,
): InstallError | undefined;
function maybeHandleInstallError(
  {spec, tmpdir}: PkgManagerInstallContext,
  errOrResult: ExecError | ExecOutput,
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
  } else if (errOrResult.exitCode || isError(errOrResult)) {
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
    const {
      executor,
      localPath,
      pkgName,
      signal,
      spec,
      tmpdir,
      useWorkspaces,
      verbose,
    } = ctx;
    const packArgs = [
      'pack',
      '--json',
      `--pack-destination=${tmpdir}`,
      '--foreground-scripts=false', // suppress output of lifecycle scripts so json can be parsed
    ];

    if (useWorkspaces) {
      packArgs.push('-w', localPath);
    }

    let packResult: ExecOutput;

    const workspace = {
      localPath,
      pkgName,
    } as WorkspaceInfo;

    try {
      packResult = await executor(spec, packArgs, {
        nodeOptions: {signal},
        verbose,
      });
      debug('(pack) got result');
    } catch (err) {
      debug('(pack) Failed: %O', err);
      if (isExecError(err)) {
        // in some cases we can get something more user-friendly via the JSON output
        const parsedError = parseNpmError(err.stdout);

        if (parsedError) {
          throw new PackError(parsedError.summary, spec, workspace, tmpdir, {
            error: parsedError,
            exitCode: err.exitCode,
            output: err.stderr,
          });
        }

        throw new PackError(
          `Use --verbose for more information`,
          spec,
          workspace,
          tmpdir,
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
            spec.label,
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
        cwd: tmpdir,
        installPath: path.join(tmpdir, 'node_modules', name),
        localPath,
        pkgName: name,
        pkgSpec: path.join(tmpdir, filename),
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
    verbose,
  }: PkgManagerRunScriptContext): Promise<RunScriptResult> {
    const {cwd, pkgName, script} = manifest;

    let rawResult: ExecOutput | undefined;
    let error: ScriptFailedError | undefined;

    const isMissingScript = (str: string) => MISSING_SCRIPT_REGEX.test(str);

    // we don't use --if-present because the output does not elide that the
    // script is missing
    try {
      rawResult = await executor(spec, ['run', '--json', script], {
        nodeOptions: {cwd, signal},
        verbose,
      });
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

    if (rawResult.exitCode) {
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

      const {command, exitCode, stderr, stdout} = rawResult;
      const message = exitCode
        ? `Script "${script}" in package "${pkgName}" failed with exit code ${exitCode}`
        : `Script "${script}" in package "${pkgName}" failed`;
      error = new ScriptFailedError(message, {
        command,
        exitCode,
        output: stderr || stdout,
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
