import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {type Component} from '../component/component';
import {RuleContext} from '../component/rule/context';
import {
  RuleConfig,
  type BaseNormalizedRuleOptions,
  type BaseNormalizedRuleOptionsRecord,
  type Rule,
  type RuleOptionSchema,
  type SomeRule,
} from '../component/rule/rule';
import {type RuleOk} from '../component/rule/rule-result';
import {RuleSeverity} from '../component/rule/severity';
import {type StaticRuleContext} from '../component/rule/static';
import {readPackageJson, readPackageJsonSync} from '../util';
import {DirCreationError} from '../util-error';

export {
  ReadPackageJsonNormalizedResult,
  ReadPackageJsonOpts,
  ReadPackageJsonResult,
} from '../util';
export {readPackageJson, readPackageJsonSync};

async function createStaticRuleContext(
  pkgPath: string,
  severity: RuleSeverity,
): Promise<StaticRuleContext> {
  const {packageJson: pkgJson, path: pkgJsonPath} = await readPackageJson({
    cwd: pkgPath,
    strict: true,
  });

  return {
    pkgJson,
    pkgJsonPath,
    pkgPath,
    severity,
  };
}

/**
 * Creates a {@link RuleContext} object which will be used to execute a
 * {@link Rule}.
 *
 * `RuleRunner` components should use this to create a `RuleContext` for each
 * package and `Rule` they execute.
 *
 * @param rule - Rule for context
 * @param pkgPath - Path to package which will be provided to Rule
 * @param ruleConfig - Specific rule configuration (`severity`, `opts`)
 * @returns A new {@link RuleContext}
 */
export async function createRuleContext<
  const Name extends string,
  Schema extends RuleOptionSchema | void = void,
  Cfg extends BaseNormalizedRuleOptions = BaseNormalizedRuleOptions,
>(
  rule: Component<Rule<Name, Schema>>,
  pkgPath: string,
  ruleConfig: Cfg,
): Promise<Readonly<RuleContext>> {
  const {severity} = ruleConfig;
  const staticCtx = await createStaticRuleContext(pkgPath, severity);
  return RuleContext.create(rule, staticCtx);
}

export function createRuleOkResult(
  rule: SomeRule,
  context: Readonly<RuleContext>,
): RuleOk {
  return {rule: rule.toJSON(), context: context.toJSON()};
}

export function getConfigForRule<
  const Name extends string,
  Schema extends RuleOptionSchema | void = void,
>(
  rule: Component<Rule<Name, Schema>>,
  config: BaseNormalizedRuleOptionsRecord,
): Readonly<RuleConfig<Schema>> {
  return Object.freeze({...config[rule.id]}) as Readonly<RuleConfig<Schema>>;
}
/**
 * Creates a temp dir
 *
 * @returns New temp dir path
 * @todo This should be created in `createPluginAPI()` and the prefix should
 *   include the plugin name.
 */

export async function createTempDir(prefix = TMP_DIR_PREFIX): Promise<string> {
  const fullPrefix = path.join(tmpdir(), prefix);
  try {
    return await fs.mkdtemp(fullPrefix);
  } catch (err) {
    throw new DirCreationError(
      `Failed to create temp directory with prefix ${fullPrefix}`,
      fullPrefix,
      err as NodeJS.ErrnoException,
    );
  }
}
export const TMP_DIR_PREFIX = 'midnight-smoker-';
