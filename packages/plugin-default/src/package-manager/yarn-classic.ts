import Debug from 'debug';
import {curry} from 'lodash';
import {ERROR, FAILED, OK, SKIPPED} from 'midnight-smoker/constants';
import {
  ExecError,
  InstallError,
  PackError,
  RunScriptError,
  ScriptFailedError,
  UnknownScriptError,
  normalizeVersion,
  type ExecResult,
  type InstallManifest,
  type PkgManagerDef,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  type RunScriptResult,
  type WorkspaceInfo,
} from 'midnight-smoker/pkg-manager';
import {isSmokerError} from 'midnight-smoker/util';
import path from 'node:path';
import {Range} from 'semver';
import {yarnVersionData} from './data';

const debug = Debug('smoker:pkg-manager:yarn-classic');

interface YarnWorkspaceInfo {
  location: string;

  [key: string]: any;
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
  const {executor, spec, runScriptManifest, loose} = ctx;
  const {script, pkgName, cwd} = runScriptManifest;
  let rawResult: ExecResult | undefined;
  let error: ScriptFailedError | undefined;
  try {
    rawResult = await executor(spec, ['run', script], {}, {cwd});
  } catch (err) {
    if (isSmokerError(ExecError, err)) {
      if (isScriptNotFound(err.stderr)) {
        if (loose) {
          return {type: SKIPPED};
        }
        return {
          type: ERROR,
          error: new UnknownScriptError(
            `Script "${script}" in package "${pkgName}" not found`,
            script,
            pkgName,
          ),
        };
      }
      return {
        type: ERROR,
        error: new RunScriptError(err, script, pkgName, spec.spec),
      };
    }
    throw err;
  }

  if (rawResult.failed) {
    if (isScriptNotFound(rawResult.stderr)) {
      return loose
        ? {
            type: SKIPPED,
          }
        : {
            rawResult,
            error: new UnknownScriptError(
              `Script "${script}" in package "${pkgName}" not found`,
              script,
              pkgName,
            ),
            type: ERROR,
          };
    }

    const {exitCode, command, all, stderr, stdout} = rawResult;
    const message = exitCode
      ? `Script "${script}" in package "${pkgName}" failed with exit code ${exitCode}`
      : `Script "${script}" in package "${pkgName}" failed`;
    error = new ScriptFailedError(message, {
      script,
      pkgName,
      pkgManager: spec.spec,
      command,
      exitCode,
      output: all || stderr || stdout,
    });
  }

  return error ? {type: FAILED, rawResult, error} : {type: OK, rawResult};
}

export const accepts = curry((supportedVersionRange: Range, value: string) => {
  const version = normalizeVersion(yarnVersionData, value);
  if (version && supportedVersionRange.test(version)) {
    return version;
  }
}, 2);

export const YarnClassic = {
  bin: 'yarn',

  lockfile: 'yarn.lock',

  supportedVersionRange,

  accepts: accepts(supportedVersionRange),

  async install(ctx: PkgManagerInstallContext): Promise<ExecResult> {
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
      if (isSmokerError(ExecError, err)) {
        throw new InstallError(err.message, spec.spec, pkgSpec, tmpdir, {
          error: err,
          exitCode: err.exitCode,
          output: err.all || err.stderr || err.stdout,
        });
      }
      throw err;
    }

    return installResult;
  },

  async pack(ctx: PkgManagerPackContext): Promise<InstallManifest> {
    const {tmpdir, executor, spec, localPath, pkgName, pkgJson, pkgJsonPath} =
      ctx;
    const computeSlug = (info: YarnWorkspaceInfo) => {
      let slug = path.basename(info.location);
      for (let i = 0; i++; seenSlugs.has(slug)) {
        slug = `${slug}-${i}`;
      }
      seenSlugs.add(slug);
      return slug;
    };
    const cwd = ctx.localPath;
    const slug = computeSlug({location: localPath});
    const tarball = path.join(tmpdir, `${slug}.tgz`);
    const args = ['pack', '--json', `--filename=${tarball}`];

    try {
      await executor(spec, args, {}, {cwd});
    } catch (err) {
      if (err instanceof ExecError) {
        const workspaceInfo = {
          localPath,
          pkgName,
          pkgJson,
          pkgJsonPath,
        } as WorkspaceInfo;
        throw new PackError(err.message, spec.spec, workspaceInfo, ctx.tmpdir, {
          error: err,
          exitCode: err.exitCode,
          output: err.all || err.stderr || err.stdout,
        });
      }
      throw err;
    }
    const installManifest: InstallManifest = {
      pkgSpec: tarball,
      cwd: tmpdir,
      installPath: path.join(tmpdir, 'node_modules', ctx.pkgName),
      pkgName: ctx.pkgName,
    };
    return installManifest;
  },

  async runScript(ctx: PkgManagerRunScriptContext): Promise<RunScriptResult> {
    return runScript(ctx, (value) => /Command ".+?" not found/i.test(value));
  },
} as const satisfies PkgManagerDef;

export default YarnClassic;
