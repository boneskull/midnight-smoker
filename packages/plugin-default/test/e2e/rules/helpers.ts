import {
  type RuleIssue,
  type RuleOptions,
  type SomeRule,
} from 'midnight-smoker/rule';
import {createRuleContext} from 'midnight-smoker/rule-runner';
import {SmokerRuleRunner} from '../../../src/rule-runner';

/**
 * Runs a {@link Rule} against a fixture.
 *
 * @param rule - Rule to apply
 * @param installPath - Path to installed package dir (test fixture)
 * @param opts - Rule-specific options (not including `severity`). Will be
 *   merged over default options
 * @returns This will be empty if there were no issues raised
 */
export async function applyRule<R extends SomeRule>(
  rule: R,
  installPath: string,
  opts?: RuleOptions<R['schema']>,
): Promise<readonly RuleIssue[] | undefined> {
  const config = {
    severity: rule.defaultSeverity,
    opts: {...rule.defaultOptions, ...opts},
  };
  const ctx = await createRuleContext(rule, installPath, config);
  await SmokerRuleRunner.runRule(ctx, rule, config);
  return ctx.finalize();
}
