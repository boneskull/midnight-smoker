import {type ERROR, FAILED, OK} from '#constants';
import {AbortError} from '#error/abort-error';
import {RuleError} from '#error/rule-error';
import {type CheckResultFailed, type CheckResultOk} from '#rule/check-result';
import {type LintManifest} from '#rule/lint-manifest';
import {RuleContext} from '#rule/rule-context';
import {type StaticRuleContext} from '#rule/static-rule-context';
import {type SomeRule} from '#schema/rule';
import {type SomeRuleConfig} from '#schema/rule-options';
import {isAbortError} from '#util/guard/abort-error';
import {isSmokerError} from '#util/guard/smoker-error';
import {asResult, type Result} from '#util/result';
import {serialize} from '#util/serialize';
import {fromPromise} from 'xstate';

export type LintLogicOutput = LintLogicOutputFailed | LintLogicOutputOk;

interface BaseLintLogicOutput {
  config: SomeRuleConfig;
  installPath: string;
  manifest: Result<LintManifest>;
  ruleId: string;
}

/**
 * Input for {@link lintLogic}
 */
export interface LintLogicInput {
  config: SomeRuleConfig;
  ctx: StaticRuleContext;

  /**
   * This is for round-tripping
   */
  manifest: LintManifest;

  rule: SomeRule;
  ruleId: string;
}

/**
 * Output for {@link lintLogic}, in case of an error
 */
export interface LintLogicOutputError extends BaseLintLogicOutput {
  error: RuleError;
  type: typeof ERROR;
}

/**
 * Output for {@link lintLogic}, in case of a failed check
 */
export interface LintLogicOutputFailed extends BaseLintLogicOutput {
  actorId: string;
  result: CheckResultFailed[];
  type: typeof FAILED;
}

/**
 * Output for {@link lintLogic}, in case of a successful check
 */
export interface LintLogicOutputOk extends BaseLintLogicOutput {
  actorId: string;
  result: CheckResultOk;
  type: typeof OK;
}

/**
 * Runs a single {@link Rule.check} against an installed package using
 * user-provided configuration
 */
export const lintLogic = fromPromise<LintLogicOutput, LintLogicInput>(
  async ({input, self, signal}) => {
    const {config, ctx: staticCtx, rule, ruleId} = input;
    if (signal.aborted) {
      throw new AbortError(signal.reason, self.id);
    }
    const {opts} = config;
    const ctx = RuleContext.create(rule, staticCtx, ruleId);

    try {
      await rule.check(ctx, opts, signal);
    } catch (err) {
      if (isAbortError(err)) {
        if (isSmokerError(AbortError, err)) {
          throw err;
        }
        throw new AbortError(err.message || signal.reason, self.id);
      }
      throw new RuleError(
        `Rule "${ruleId}" threw when checking package "${ctx.pkgName}"`,
        {...asResult(staticCtx), config, ruleId},
        err,
      );
    }

    const result = ctx.finalize();
    const manifest = asResult(serialize(input.manifest));

    switch (result.type) {
      case OK: {
        const output: LintLogicOutputOk = {
          actorId: self.id,
          config,
          installPath: ctx.installPath,
          manifest,
          result,
          ruleId,
          type: OK,
        };
        return output;
      }
      case FAILED: {
        const output: LintLogicOutputFailed = {
          actorId: self.id,
          config,
          installPath: ctx.installPath,
          manifest,
          // TODO fix this readonly disagreement.  it _should_ be read-only, but that breaks somewhere down the line
          result: [...result.result],
          ruleId,
          type: FAILED,
        };

        return output;
      }
    }
  },
);
