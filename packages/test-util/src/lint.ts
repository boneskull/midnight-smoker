import {
  ComponentKinds,
  DEFAULT_PKG_MANAGER_BIN,
  DEFAULT_PKG_MANAGER_VERSION,
} from 'midnight-smoker/constants';
import {PluginInitError, fromUnknownError} from 'midnight-smoker/error';
import {RuleMachine, createActor, toPromise} from 'midnight-smoker/machine';
import {
  PluginMetadata,
  createPluginAPI,
  type PluginFactory,
} from 'midnight-smoker/plugin';
import {
  DEFAULT_RULE_SEVERITY,
  getDefaultRuleOptions,
  type CheckResultFailed,
  type CheckResultOk,
  type RuleDefSchemaValue,
  type RuleOptions,
  type SomeRuleDef,
  type SomeRuleOptions,
} from 'midnight-smoker/rule';

/**
 * A rule runner function which can only run a single rule.
 *
 * @see {@link createRuleRunner}
 */
export type NamedRuleRunner = (
  installPath: string,
  opts?: SomeRuleOptions,
) => Promise<CheckResultOk | CheckResultFailed[]>;

/**
 * A rule runner function which can run any rule defined by the plugin factory.
 *
 * @see {@link createRuleRunner}
 */
export type RuleRunner = (
  name: string,
  installPath: string,
  opts?: SomeRuleOptions,
) => Promise<CheckResultOk | CheckResultFailed[]>;

/**
 * Factory function which creates a {@link NamedRuleRunner}.
 *
 * Since a {@link PluginFactory} can define multiple rules, this function allows
 * you to specify which rule to run.
 *
 * If you wish to test multiple rules, omit the `name` parameter; you will
 * receive a {@link RuleRunner} instead.
 *
 * If you have a `RuleDef` instead of a `PluginFactory`, use {@link runRule}
 * instead.
 *
 * @param factory Plugin factory function
 * @param name Rule name
 * @returns Rule runner function (can only run the rule specified by the `name`
 *   parameter)
 */
export async function createRuleRunner(
  factory: PluginFactory,
  name: string,
): Promise<NamedRuleRunner>;

/**
 * Factory function which creates a {@link RuleRunner}.
 *
 * Since a {@link PluginFactory} can define multiple rules, this function allows
 * you to run any rule defined by the plugin.
 *
 * If you only wish to test a single rule, supply a `name` property for the
 * second parameter.
 *
 * If you have a `RuleDef` instead of a `PluginFactory`, use {@link runRule}
 * instead.
 *
 * @param factory Plugin factory function
 * @returns Rule runner function (can run any rule defined by the plugin
 *   factory)
 */
export async function createRuleRunner(
  factory: PluginFactory,
): Promise<RuleRunner>;

export async function createRuleRunner(factory: PluginFactory, name?: string) {
  const ruleDefs: Map<string, SomeRuleDef> = new Map();
  const metadata = PluginMetadata.createTransient('test-plugin');
  const pluginApi = createPluginAPI(
    (kind, def, name) => {
      if (kind === ComponentKinds.RuleDef) {
        ruleDefs.set(name, def as SomeRuleDef);
      }
    },
    () => [],
    metadata,
  );
  try {
    await factory(pluginApi);
  } catch (err) {
    throw new PluginInitError(fromUnknownError(err), metadata);
  }

  if (name) {
    const def = ruleDefs.get(name);
    if (!def) {
      throw new ReferenceError(`RuleDef "${name}" not found`);
    }
    return async (installPath: string, opts?: SomeRuleOptions) =>
      runRule(def, installPath, opts);
  }

  return async (name: string, installPath: string, opts?: SomeRuleOptions) => {
    const def = ruleDefs.get(name);
    if (!def) {
      throw new ReferenceError(`RuleDef "${name}" not found`);
    }
    return runRule(def, installPath, opts);
  };
}

/**
 * Given a rule definition, runs the rule against a package dir with the
 * specified options (if given).
 *
 * @param def Rule definition
 * @param installPath Path to package dir to test
 * @param opts Rule-specific options
 * @returns A `CheckOutput` object
 */
export async function runRule<T extends SomeRuleDef>(
  def: T,
  installPath: string,
  opts?: RuleOptions<T['schema']>,
): Promise<CheckResultOk | CheckResultFailed[]> {
  const plan = 1;
  const defaultOpts = getDefaultRuleOptions(def.schema as RuleDefSchemaValue);
  const someConfig = {
    opts: {...defaultOpts, ...opts},
    severity: DEFAULT_RULE_SEVERITY,
  };
  const ruleMachine = createActor(RuleMachine, {
    input: {
      def,
      ruleId: def.name,
      config: someConfig,
      plan,
    },
  });
  ruleMachine.send({
    type: 'CHECK',
    ctx: {
      installPath,
      localPath: '',
      pkgName: '',
      ruleId: def.name,
      severity: someConfig.severity,
      pkgJson: {},
      pkgJsonPath: '',
      pkgManager: `${DEFAULT_PKG_MANAGER_BIN}@${DEFAULT_PKG_MANAGER_VERSION}`,
    },
    manifest: {
      installPath,
      pkgJsonPath: '',
      pkgJson: {},
      localPath: '',
      pkgName: '',
    },
  });
  const output = await toPromise(ruleMachine);
  if (output.length !== plan) {
    throw new Error(`Expected exactly ${plan} result(s)`);
  }
  return output.shift()!.result;
}
