import type {Component, Rule} from 'midnight-smoker/plugin';
import {Helpers} from 'midnight-smoker/plugin';
import {SmokerRuleRunner} from '../../../src/rule-runner';

/**
 * Runs a {@link Rule} against a fixture.
 *
 * @param rule - Rule to apply
 * @param pkgPath - Path to installed package dir (test fixture)
 * @param opts - Rule-specific options (not including `severity`). Will be
 *   merged over default options
 * @returns This will be empty if there were no issues raised
 */
export async function applyRule<R extends Component<Rule.SomeRule>>(
  rule: R,
  pkgPath: string,
  opts?: Rule.RuleOptions<R['schema']>,
): Promise<readonly Rule.RuleIssue[] | undefined> {
  const config = {
    severity: rule.defaultSeverity,
    opts: {...rule.defaultOptions, ...opts},
  };
  const ctx = await Helpers.createRuleContext(rule, pkgPath, config);
  await SmokerRuleRunner.runRule(ctx, rule, config);
  return ctx.finalize();
}
