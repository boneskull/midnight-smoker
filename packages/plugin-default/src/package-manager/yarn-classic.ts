import {ERROR, FAILED, OK, SKIPPED} from 'midnight-smoker/constants';
import {
  ExecError,
  type ExecOutput,
  InstallError,
  type InstallManifest,
  PackError,
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
import path from 'node:path';
import {Range} from 'semver';

import {yarnVersionData} from './data';
import {isExecError} from './util';

interface YarnWorkspaceInfo {
  [key: string]: any;

  location: string;
}

const seenSlugs = new Set();

const supportedVersionRange = new Range('^1.0.0');

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
export async function runScript(
  ctx: PkgManagerRunScriptContext,
  isScriptNotFound: (value: string) => boolean,
): Promise<RunScriptResult> {
  const {executor, loose, manifest, signal, spec, verbose} = ctx;
  const {cwd, pkgName, script} = manifest;
  let rawResult: ExecOutput | undefined;
  let error: ScriptFailedError | undefined;
  try {
    rawResult = await executor(spec, ['run', script], {
      nodeOptions: {cwd, signal},
      verbose,
    });
  } catch (err) {
    if (isExecError(err)) {
      if (isScriptNotFound(err.stderr) || isScriptNotFound(err.stdout)) {
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
    throw err;
  }

  if (rawResult.exitCode) {
    if (isScriptNotFound(rawResult.stderr)) {
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

  return error
    ? {error, manifest, rawResult, type: FAILED}
    : {manifest, rawResult, type: OK};
}

export const YarnClassic = Object.freeze({
  bin: 'yarn',

  async install(ctx: PkgManagerInstallContext): Promise<ExecOutput> {
    const {executor, installManifest, signal, spec, tmpdir, verbose} = ctx;

    const {pkgSpec} = installManifest;

    const installArgs = ['add', '--no-lockfile', '--force', pkgSpec];

    let installResult: ExecOutput;
    try {
      installResult = await executor(spec, installArgs, {
        nodeOptions: {cwd: tmpdir, signal},
        verbose,
      });
    } catch (err) {
      if (isExecError(err)) {
        throw new InstallError(err.message, spec, pkgSpec, tmpdir, {
          error: err,
          exitCode: err.exitCode,
          output: err.stderr || err.stdout,
        });
      }
      throw err;
    }

    return installResult;
  },

  lockfile: 'yarn.lock',

  name: 'yarn-classic',

  async pack(ctx: PkgManagerPackContext): Promise<InstallManifest> {
    const {
      executor,
      localPath,
      pkgJson,
      pkgJsonPath,
      pkgName,
      signal,
      spec,
      tmpdir,
      verbose,
    } = ctx;
    const computeSlug = (info: YarnWorkspaceInfo) => {
      let slug = path.basename(info.location);
      for (let i = 0; i++; seenSlugs.has(slug)) {
        slug = `${slug}-${i}`;
      }
      seenSlugs.add(slug);
      return slug;
    };
    const cwd = localPath;
    const slug = computeSlug({location: localPath});
    const tarball = path.join(tmpdir, `${slug}.tgz`);
    const args = ['pack', '--json', `--filename=${tarball}`];

    try {
      await executor(spec, args, {nodeOptions: {cwd, signal}, verbose});
    } catch (err) {
      if (err instanceof ExecError) {
        const workspaceInfo = {
          localPath,
          pkgJson,
          pkgJsonPath,
          pkgName,
        } as WorkspaceInfo;
        throw new PackError(err.message, spec, workspaceInfo, ctx.tmpdir, {
          error: err,
          exitCode: err.exitCode,
          output: err.stderr || err.stdout,
        });
      }
      throw err;
    }
    const installManifest: InstallManifest = {
      cwd: tmpdir,
      installPath: path.join(tmpdir, 'node_modules', ctx.pkgName),
      pkgName: ctx.pkgName,
      pkgSpec: tarball,
    };
    return installManifest;
  },

  async runScript(ctx: PkgManagerRunScriptContext): Promise<RunScriptResult> {
    return runScript(ctx, (value) => /Command ".+?" not found/i.test(value));
  },

  supportedVersionRange,

  versions: yarnVersionData,
} as const) satisfies Readonly<PkgManager>;
