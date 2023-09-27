import createDebug from 'debug';
import {RunScriptError, UnknownScriptError} from '../error';
import type {InstallManifest, RunManifest, RunScriptResult} from '../types';
import {CorepackExecutor} from './corepack';
import {type ExecError} from './executor';
import type {
  InstallOpts,
  InstallResult,
  PackOpts,
  PackageManager,
  PackageManagerOpts,
} from './pm';

export abstract class GenericNpmPackageManager implements PackageManager {
  protected abstract debug: createDebug.Debugger;

  public readonly name = 'npm';

  constructor(
    protected readonly executor: CorepackExecutor,
    protected readonly opts: PackageManagerOpts,
  ) {}
  public abstract install(
    manifest: InstallManifest,
    opts?: InstallOpts | undefined,
  ): Promise<InstallResult>;

  public abstract pack(
    dest: string,
    opts?: PackOpts | undefined,
  ): Promise<InstallManifest>;

  public async runScript(manifest: RunManifest): Promise<RunScriptResult> {
    if (!manifest) {
      throw new TypeError('(runScript) "manifest" arg is required');
    }
    const {script, packedPkg} = manifest;
    const args = ['run', script];
    const {pkgName, installPath: cwd} = packedPkg;

    let result: RunScriptResult;
    try {
      const rawResult = await this.executor.exec(args, {
        cwd,
      });
      result = {pkgName, script, rawResult, cwd};
    } catch (err) {
      const error = err as ExecError;
      result = {
        pkgName,
        script,
        rawResult: error,
        cwd,
      };
      if (this.opts.loose && /missing script:/i.test(error.stderr)) {
        result.skipped = true;
      } else {
        result.error = new RunScriptError(
          `Script "${script}" in package "${pkgName}" failed`,
          script,
          pkgName,
          this.name,
          {error, exitCode: error.exitCode, output: error.stderr},
        );
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
        if (result.rawResult.exitCode) {
          message = `Script "${script}" in package "${pkgName}" failed with exit code ${result.rawResult.exitCode}`;
        } else {
          message = `Script "${script}" in package "${pkgName}" failed`;
        }
        result.error = new RunScriptError(message, script, pkgName, this.name, {
          exitCode: result.rawResult.exitCode,
          output: result.rawResult.all,
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
}
