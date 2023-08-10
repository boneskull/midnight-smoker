import type {InstallManifest, RunManifest, RunScriptResult} from '../types';
import {SmokerError} from '../error';
import {type ExecError} from './executor';
import {CorepackExecutor} from './corepack';
import type {
  InstallOpts,
  InstallResult,
  PackOpts,
  PackageManager,
  PackageManagerOpts,
  RunScriptOpts,
} from './pm';
import createDebug from 'debug';

export abstract class GenericNpmPackageManager implements PackageManager {
  protected abstract debug: createDebug.Debugger;

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

  public async runScript(
    manifest: RunManifest,
    opts: RunScriptOpts = {},
  ): Promise<RunScriptResult> {
    if (!manifest) {
      throw new TypeError('(runScript) "manifest" arg is required');
    }
    const {script, packedPkg} = manifest;
    const npmArgs = ['run', script];
    const {pkgName, installPath: cwd} = packedPkg;
    const extraArgs = opts.extraArgs ?? [];
    let result: RunScriptResult;
    try {
      const rawResult = await this.executor.exec([...npmArgs, ...extraArgs], {
        cwd,
      });
      result = {pkgName, script, rawResult, cwd};
    } catch (err) {
      const error = err as ExecError;
      result = {
        pkgName,
        script,
        error: new SmokerError(
          `(runScript) Script "${script}" in package "${pkgName}" failed: ${error.message}`,
        ),
        rawResult: error,
        cwd,
      };
    }

    if (!result.error && result.rawResult.failed) {
      let message: string;
      if (
        result.rawResult.stderr &&
        /missing script:/i.test(result.rawResult.stderr)
      ) {
        message = `(runScript) Script "${script}" in package "${pkgName}" failed; script not found`;
      } else {
        if (result.rawResult.exitCode) {
          message = `(runScript) Script "${script}" in package "${pkgName}" failed with exit code ${result.rawResult.exitCode}: ${result.rawResult.all}`;
        } else {
          message = `(runScript) Script "${script}" in package "${pkgName}" failed: ${result.rawResult.all}`;
        }
      }
      result.error = new SmokerError(message);
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
