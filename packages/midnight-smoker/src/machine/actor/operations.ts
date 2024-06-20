/**
 * Contains `Promise`-based actors performing _operations_.
 *
 * An operation is one of the four major tasks `midnight-smoker` performs:
 *
 * 1. Packing a workspace into a tarball
 * 2. Installing the tarball into a temporary directory
 * 3. Running rules against the installed package
 * 4. Running custom scripts within the installed package
 *
 * @packageDocumenation
 * @todo Need `meta` modules for error and schema
 */

import {ERROR, FAILED, OK} from '#constants';
import {AbortError, isAbortError} from '#error/abort-error';
import {InstallError} from '#error/install-error';
import {PackError} from '#error/pack-error';
import {PackParseError} from '#error/pack-parse-error';
import {RuleError} from '#error/rule-error';
import {RunScriptError} from '#error/run-script-error';
import {ScriptFailedError} from '#error/script-failed-error';
import {UnknownScriptError} from '#error/unknown-script-error';
import {type CheckOutput} from '#machine/rule-machine';
import {RuleContext} from '#rule/rule-context';
import {type CheckFailed, type CheckOk} from '#schema/check-result';
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
import {type SomeRuleConfig} from '#schema/rule-options';
import {type StaticRuleContext} from '#schema/rule-static';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {
  type RunScriptResult,
  type RunScriptResultError,
  type RunScriptResultFailed,
} from '#schema/run-script-result';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {fromUnknownError, isExecaError, isSmokerError} from '#util/error-util';
import {asResult, type Result} from '#util/result';
import {serialize} from '#util/serialize';
import {fromPromise} from 'xstate';

/**
 * Output of {@link runScript}
 */
export interface RunScriptOutput {
  manifest: RunScriptManifest;
  result: RunScriptResult;
}

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
 * Common input for various actors
 */
export interface OperationInput<Ctx extends PkgManagerContext> {
  ctx: Omit<Ctx, 'signal'>;
  def: PkgManagerDef;
  spec: StaticPkgManagerSpec;
}

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

export interface BaseCheckOutput {
  config: SomeRuleConfig;
  installPath: string;
  manifest: Result<LintManifest>;
  ruleId: string;
}

export interface CheckInput {
  config: SomeRuleConfig;
  ctx: StaticRuleContext;
  def: SomeRuleDef;

  /**
   * This is for round-tripping
   */
  manifest: LintManifest;
  ruleId: string;
}

export interface CheckOutputError extends BaseCheckOutput {
  error: RuleError;
  type: typeof ERROR;
}

export interface CheckOutputFailed extends BaseCheckOutput {
  actorId: string;
  result: CheckFailed[];
  type: typeof FAILED;
}

export interface CheckOutputOk extends BaseCheckOutput {
  actorId: string;
  result: CheckOk;
  type: typeof OK;
}

/**
 * Runs a single {@link RuleDef.check} against an installed package using
 * user-provided configuration
 */

export const check = fromPromise<CheckOutput, CheckInput>(
  async ({self, input, signal}) => {
    const {ctx: staticCtx, config, def, ruleId} = input;
    if (signal.aborted) {
      throw new AbortError(signal.reason, self.id);
    }
    const {opts} = config;
    const ctx = RuleContext.create(def, staticCtx, ruleId);

    try {
      await def.check(ctx, opts, signal);
    } catch (err) {
      if (isAbortError(err)) {
        if (isSmokerError(AbortError, err)) {
          throw err;
        }
        throw new AbortError(err.message || signal.reason, self.id);
      }
      throw new RuleError(
        `Rule "${ruleId}" threw an exception`,
        {...asResult(staticCtx), ruleId, config},
        fromUnknownError(err),
      );
    }

    const result = ctx.finalize();
    const manifest = asResult(serialize(input.manifest));

    switch (result.type) {
      case 'OK': {
        const output: CheckOutputOk = {
          config,
          manifest,
          ruleId,
          result,
          type: OK,
          actorId: self.id,
          installPath: ctx.installPath,
        };
        return output;
      }
      case 'FAILED': {
        const output: CheckOutputFailed = {
          installPath: ctx.installPath,
          config,
          manifest,
          ruleId,
          // TODO fix this readonly disagreement.  it _should_ be read-only, but that breaks somewhere down the line
          result: [...result.result],
          actorId: self.id,
          type: FAILED,
        };

        return output;
      }
    }
  },
);
