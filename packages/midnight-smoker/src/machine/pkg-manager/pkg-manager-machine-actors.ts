import {
  type InstallManifest,
  type InstallResult,
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  type PkgManagerSpec,
  type RunScriptManifest,
  type RunScriptResult,
} from '#pkg-manager';
import {RuleContext, type RuleResultOk} from '#rule';
import type {FileManager} from '#util';
import {isEmpty, isFunction} from 'lodash';
import {fromPromise} from 'xstate';
import {
  type CheckInput,
  type CheckItem,
  type CheckOutput,
} from './pkg-manager-machine-events';

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
  ctx: Ctx;
  def: PkgManagerDef;
}

/**
 * Input for {@link prepareLintItem}
 */
export interface PrepareLintItemInput {
  fileManager: FileManager;
  lintItem: Omit<CheckItem, 'pkgJson' | 'pkgJsonPath'>;
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
  async ({input: {spec, fileManager}}) => {
    return await fileManager.createTempDir(
      `${spec.pkgManager}-${spec.version}`,
    );
  },
);

/**
 * Runs the "setup" lifecycle of a package manager, if defined
 */
export const setupPkgManager = fromPromise<void, LifecycleInput>(
  async ({input: {def, ctx}}) => {
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
  async ({input: {tmpdir, fileManager}}) => {
    await fileManager.pruneTempDir(tmpdir);
  },
);

/**
 * Runs the "teardown" lifecycle of a package manager, if defined
 */
export const teardownPkgManager = fromPromise<void, LifecycleInput>(
  async ({input: {def, ctx}}) => {
    if (isFunction(def.teardown)) {
      await def.teardown(ctx);
    }
  },
);

/**
 * Packs a package into a tarball
 */
export const pack = fromPromise<InstallManifest, PackInput>(
  async ({input: {def, ctx}}) => {
    const manifest = await def.pack(ctx);
    return {localPath: ctx.localPath, ...manifest};
  },
);

/**
 * Installs a package
 */
export const install = fromPromise<InstallResult, InstallInput>(
  async ({input: {def, ctx}}) => {
    const rawResult = await def.install(ctx);
    return {rawResult, installManifest: ctx.installManifest};
  },
);

/**
 * Output of {@link runScript}
 */
export interface RunScriptOutput {
  result: RunScriptResult;
  manifest: RunScriptManifest;
}

/**
 * Runs a script
 */
export const runScript = fromPromise<RunScriptOutput, RunScriptInput>(
  async ({input: {def, ctx}}) => {
    const result = await def.runScript(ctx);

    return {result, manifest: ctx.runScriptManifest};
  },
);

/**
 * Assigns package.json information to a {@link CheckItem}
 */
export const prepareLintItem = fromPromise<CheckItem, PrepareLintItemInput>(
  async ({input: {lintItem, fileManager}}) => {
    const {packageJson: pkgJson, path: pkgJsonPath} =
      await fileManager.findPkgUp(lintItem.manifest.installPath, {
        strict: true,
      });
    return {...lintItem, pkgJson, pkgJsonPath};
  },
);

/**
 * Runs a single rule's check against an installed package using user-provided
 * configuration
 */
export const check = fromPromise<CheckOutput, CheckInput>(async ({input}) => {
  const {pkgManager, pkgJson, pkgJsonPath, manifest, rule, config} = input;

  const ctx = RuleContext.create(rule, {
    ...manifest,
    pkgJson,
    pkgJsonPath,
    severity: config.severity,
    pkgManager: `${pkgManager}`,
  });

  try {
    await rule.check(ctx, config.opts);
  } catch (err) {
    ctx.addIssueFromError(err);
  }
  const issues = ctx.finalize() ?? [];
  if (isEmpty(issues)) {
    const ok: RuleResultOk = {type: 'OK', ctx, rule: rule.toJSON()};
    return {...input, result: ok, type: 'OK'};
  }
  return {
    ...input,
    // TODO fix this readonly disagreement.  it _should_ be read-only, but that breaks somewhere down the line
    result: [...issues],
    ctx,
    type: 'FAILED',
  };
});
