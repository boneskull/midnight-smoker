import {
  type InstallManifest,
  type InstallResult,
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  type PkgManagerSpec,
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

export type InstallInput = OperationInput<PkgManagerInstallContext>;

export type PackInput = OperationInput<PkgManagerPackContext>;

export type RunScriptInput = OperationInput<PkgManagerRunScriptContext>;

export interface OperationInput<Ctx extends PkgManagerContext> {
  ctx: Ctx;
  def: PkgManagerDef;
}

export const createTempDir = fromPromise<
  string,
  {spec: PkgManagerSpec; fileManager: FileManager}
>(async ({input: {spec, fileManager}}) => {
  return await fileManager.createTempDir(`${spec.pkgManager}-${spec.version}`);
});

export const setupPkgManager = fromPromise<
  void,
  {def: PkgManagerDef; ctx: PkgManagerContext}
>(async ({input: {def, ctx}}) => {
  if (isFunction(def.setup)) {
    await def.setup(ctx);
  }
});

export const pruneTempDir = fromPromise<
  void,
  {tmpdir: string; fileManager: FileManager}
>(async ({input: {tmpdir, fileManager}}) => {
  await fileManager.pruneTempDir(tmpdir);
});

export const teardownPkgManager = fromPromise<
  void,
  {def: PkgManagerDef; ctx: PkgManagerContext}
>(async ({input: {def, ctx}}) => {
  if (isFunction(def.teardown)) {
    await def.teardown(ctx);
  }
});

export const pack = fromPromise<InstallManifest, PackInput>(
  async ({input: {def, ctx}}) => {
    const manifest = await def.pack(ctx);
    return {localPath: ctx.localPath, ...manifest};
  },
);

export const install = fromPromise<InstallResult, InstallInput>(
  async ({input: {def, ctx}}) => {
    const rawResult = await def.install(ctx);
    return {rawResult, installManifest: ctx.installManifest};
  },
);

export const runScript = fromPromise<RunScriptResult, RunScriptInput>(
  async ({input: {def, ctx}}) => {
    return await def.runScript(ctx);
  },
);

export const prepareLintItem = fromPromise<
  CheckItem,
  {
    lintItem: Omit<CheckItem, 'pkgJson' | 'pkgJsonPath'>;
    fileManager: FileManager;
  }
>(async ({input: {lintItem, fileManager}}) => {
  const {packageJson: pkgJson, path: pkgJsonPath} = await fileManager.findPkgUp(
    lintItem.manifest.installPath,
    {
      strict: true,
    },
  );
  return {...lintItem, pkgJson, pkgJsonPath};
});

export const check = fromPromise<CheckOutput, CheckInput>(async ({input}) => {
  const {
    pkgManager: pkgManagerSpec,
    pkgJson,
    pkgJsonPath,
    manifest: lintManifest,
    rule,
    config,
  } = input;

  const ctx = RuleContext.create(rule, {
    ...lintManifest,
    pkgJson,
    pkgJsonPath,
    severity: config.severity,
    pkgManager: `${pkgManagerSpec}`,
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
    result: [...issues],
    ctx,
    type: 'FAILED',
  };
});
