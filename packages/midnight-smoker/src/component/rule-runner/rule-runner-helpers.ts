import {type Component} from '#component';
import {
  RuleContext,
  type Rule,
  type RuleConfig,
  type RuleOk,
  type RuleSeverity,
  type StaticRuleContext,
} from '#rule';
import type {
  BaseNormalizedRuleOptions,
  BaseNormalizedRuleOptionsRecord,
  RuleDefSchemaValue,
} from '#schema/rule-options.js';
import type {SomeRule} from '#schema/rule.js';
import {readPackageJson} from '#util/pkg-util.js';

/**
 * Creates a {@link RuleContext} object which will be used to execute a
 * {@link Rule}.
 *
 * `RuleRunner` components should use this to create a `RuleContext` for each
 * package and `Rule` they execute.
 *
 * @param rule - Rule for context
 * @param installPath - Path to package which will be provided to Rule
 * @param ruleConfig - Specific rule configuration (`severity`, `opts`)
 * @returns A new {@link RuleContext}
 */

export async function createRuleContext<
  Cfg extends BaseNormalizedRuleOptions = BaseNormalizedRuleOptions,
>(
  rule: Component<SomeRule>,
  installPath: string,
  ruleConfig: Cfg,
): Promise<Readonly<RuleContext>> {
  const {severity} = ruleConfig;
  const staticCtx = await createStaticRuleContext(installPath, severity);
  return RuleContext.create(rule, staticCtx);
}

export function getConfigForRule<
  const Name extends string,
  Schema extends RuleDefSchemaValue | void = void,
>(
  rule: Component<Rule<Name, Schema>>,
  config: BaseNormalizedRuleOptionsRecord,
): Readonly<RuleConfig<Schema>> {
  return Object.freeze({...config[rule.id]}) as Readonly<RuleConfig<Schema>>;
} /**
 * Creates a {@link StaticRuleContext}; used by {@link createRuleContext}
 *
 * @param installPath - Path to package which will be provided to Rule
 * @param severity - Rule Severity
 * @returns
 */

export async function createStaticRuleContext(
  installPath: string,
  severity: RuleSeverity,
): Promise<StaticRuleContext> {
  // TODO find a decent way to throw "this package has an invalid package.json" error
  const {packageJson: pkgJson, path: pkgJsonPath} = await readPackageJson({
    cwd: installPath,
    strict: true,
  });

  return {
    pkgJson,
    pkgJsonPath,
    installPath,
    severity,
  };
}

export function createRuleOkResult(
  rule: SomeRule,
  context: Readonly<RuleContext>,
): RuleOk {
  return {rule: rule.toJSON(), context: context.toJSON()};
}
