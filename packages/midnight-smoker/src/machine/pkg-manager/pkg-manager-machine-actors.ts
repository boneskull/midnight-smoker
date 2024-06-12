import {ERROR, FAILED} from '#constants';
import {AbortError, isAbortError} from '#error/abort-error';
import {InstallError} from '#error/install-error';
import {PackError, PackParseError} from '#error/pack-error';
import {RunScriptError} from '#error/run-script-error';
import {ScriptFailedError} from '#error/script-failed-error';
import {UnknownScriptError} from '#error/unknown-script-error';
import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type InstallManifest} from '#schema/install-manifest';
import {type InstallResult} from '#schema/install-result';
import {type LintManifest} from '#schema/lint-manifest';
import {
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
} from '#schema/pkg-manager-def';
import {
  type RunScriptResultError,
  type RunScriptResultFailed,
} from '#schema/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {fromUnknownError, isExecaError, isSmokerError} from '#util/error-util';
import {type FileManager} from '#util/filemanager';
import {isFunction} from 'lodash';
import {fromPromise} from 'xstate';
import {type RunScriptOutput} from './pkg-manager-machine-events';

/**
 * Input for {@link install}
 */
export type InstallInput = OperationInput<PkgManagerInstallContext>;

/**
 * Input for {@link pack}
 */
export type PackInput = OperationInput<PkgManagerPackContext>;

/**
 * Input for {@link runScript}
 */
export type RunScriptInput = OperationInput<PkgManagerRunScriptContext>;

/**
 * Input for {@link createTempDir}
 */
export interface CreateTempDirInput {
  fileManager: FileManager;
  spec: PkgManagerSpec;
}

/**
 * Input for the lifecycle actors
 */
export interface LifecycleInput {
  ctx: PkgManagerContext;
  def: PkgManagerDef;
}

/**
 * Common input for various actors
 */
export interface OperationInput<Ctx extends PkgManagerContext> {
  ctx: Omit<Ctx, 'signal'>;
  def: PkgManagerDef;
  spec: StaticPkgManagerSpec;
}

/**
 * Input for {@link prepareLintItem}
 */
export interface PrepareLintItemInput {
  fileManager: FileManager;
  lintItem: Omit<LintManifest, 'pkgJson' | 'pkgJsonPath'>;
}

/**
 * Input for {@link pruneTempDir}
 */
export interface PruneTempDirInput {
  fileManager: FileManager;
  tmpdir: string;
}

/**
 * Creates a temp dir for the package manager.
 *
 * Happens prior to the "setup" lifecycle hook
 */
export const createTempDir = fromPromise<string, CreateTempDirInput>(
  async ({input: {spec, fileManager}, signal}) => {
    return fileManager.createTempDir(`${spec.bin}-${spec.version}`, signal);
  },
);

/**
 * Runs the "setup" lifecycle of a package manager, if defined
 */
export const setupPkgManager = fromPromise<void, LifecycleInput>(
  async ({input: {def, ctx}}) => {
    await Promise.resolve();
    if (isFunction(def.setup)) {
      await def.setup(ctx);
    }
  },
);

/**
 * Prunes the package manager's temporary directory.
 *
 * This happens after the teardown lifecycle hook
 */
export const pruneTempDir = fromPromise<void, PruneTempDirInput>(
  async ({input: {tmpdir, fileManager}, signal}) => {
    await fileManager.pruneTempDir(tmpdir, signal);
  },
);

/**
 * Runs the "teardown" lifecycle of a package manager, if defined
 */
export const teardownPkgManager = fromPromise<void, LifecycleInput>(
  async ({input: {def, ctx}}) => {
    await Promise.resolve();
    if (isFunction(def.teardown)) {
      await def.teardown(ctx);
    }
  },
);

/**
 * Packs a package into a tarball
 */
export const pack = fromPromise<InstallManifest, PackInput>(
  async ({input: {def, ctx, spec}, signal}) => {
    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }
    await Promise.resolve();
    try {
      const manifest = await def.pack({...ctx, signal});
      return {localPath: ctx.localPath, ...manifest};
    } catch (err) {
      if (isSmokerError(PackError, err) || isSmokerError(PackParseError, err)) {
        throw err;
      }
      throw new PackError(
        'Pack failed',
        spec,
        {
          pkgName: ctx.pkgName,
          localPath: ctx.localPath,
          pkgJson: ctx.pkgJson,
          pkgJsonPath: ctx.pkgJsonPath,
        } as WorkspaceInfo,
        ctx.tmpdir,
        err,
      );
    }
  },
);

/**
 * Installs a package
 */
export const install = fromPromise<InstallResult, InstallInput>(
  async ({input: {def, ctx, spec}, signal}) => {
    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }
    await Promise.resolve();
    try {
      const rawResult = await def.install({...ctx, signal});
      if (!isExecaError(rawResult) && rawResult.failed) {
        throw new InstallError(
          'Install failed',
          spec,
          ctx.installManifest.pkgSpec,
          ctx.installManifest.cwd,
          rawResult,
        );
      }
      return {rawResult, installManifest: ctx.installManifest};
    } catch (err) {
      if (isSmokerError(InstallError, err)) {
        throw err;
      } else {
        throw new InstallError(
          'Install failed',
          spec,
          ctx.installManifest.pkgSpec,
          ctx.installManifest.cwd,
          err,
        );
      }
    }
  },
);

/**
 * Runs a script
 *
 * This should trap errors coming out of a {@link PkgManagerDef.runScript}
 * implementation, and coerces these into a {@link RunScriptOutput.result} object
 * of type `RunScriptResultError`.
 *
 * Any other errors are wrapped in a {@link UnknownScriptError}.
 *
 * Note that a `ScriptFailedError` should be embedded in the result--not
 * thrown--if the `runScript` method is doing what it's supposed to be doing.
 */
export const runScript = fromPromise<RunScriptOutput, RunScriptInput>(
  async ({input: {def, ctx}, signal, self}) => {
    if (signal.aborted) {
      throw new AbortError(signal.reason, self.id);
    }
    await Promise.resolve();
    const {manifest} = ctx;
    try {
      const result = await def.runScript({...ctx, signal});
      return {result, manifest};
    } catch (err) {
      if (isAbortError(err)) {
        if (isSmokerError(AbortError, err)) {
          throw err;
        }
        throw new AbortError(err.message || signal.reason, self.id);
      }
      let result: RunScriptResultError | RunScriptResultFailed;
      if (
        isSmokerError(RunScriptError, err) ||
        isSmokerError(UnknownScriptError, err)
      ) {
        result = {type: ERROR, error: err, manifest};
      } else if (isSmokerError(ScriptFailedError, err)) {
        result = {type: FAILED, error: err, manifest};
      } else {
        result = {
          type: ERROR,
          manifest,
          error: new UnknownScriptError(
            `Failed to run script ${manifest.script} for package ${manifest.pkgName}`,
            manifest.script,
            manifest.pkgName,
            fromUnknownError(err),
          ),
        };
      }
      return {result, manifest};
    }
  },
);

/**
 * Assigns package.json information to a {@link LintManifest}
 */
export const prepareLintItem = fromPromise<LintManifest, PrepareLintItemInput>(
  async ({input: {lintItem, fileManager}, signal}) => {
    const {packageJson: pkgJson, path: pkgJsonPath} =
      await fileManager.findPkgUp(lintItem.installPath, {
        strict: true,
        signal,
      });
    return {...lintItem, pkgJson, pkgJsonPath};
  },
);
