import {head} from 'lodash';
import {type SmokerOptions} from 'midnight-smoker';
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
  type PluginRegistry,
} from 'midnight-smoker/plugin';
import {
  DEFAULT_RULE_SEVERITY,
  getDefaultRuleOptions,
  type RuleDefSchemaValue,
  type RuleOptions,
  type RuleResultFailed,
  type RuleResultOk,
  type SomeRuleDef,
  type SomeRuleOptions,
} from 'midnight-smoker/rule';
import {type FileManager, type FileManagerOpts} from 'midnight-smoker/util';

/**
 * Runs a {@link Rule} against a fixture.
 *
 * @param rule - Rule to apply
 * @param installPath - Path to installed package dir (test fixture)
 * @param opts - Rule-specific options (not including `severity`). Will be
 *   merged over default options
 * @returns This will be empty if there were no issues raised
 */
// export async function applyRule<R extends SomeRule>(
//   rule: R,
//   installPath: string,
//   opts?: RuleOptions<R['schema']>,
// ): Promise<readonly RuleIssue[] | undefined> {
// const config = {
//   severity: rule.defaultSeverity,
//   opts: {...rule.defaultOptions, ...opts},
// };
// // const ctx = await LintController.createRuleContext(rule, installPath, config);
// // await LintController.runRule(ctx, rule, config);
// return ctx.finalize();
//   return;
// }

export interface CreateRuleRunnerOptions {
  pluginRegistry?: PluginRegistry;
  fileManager?: FileManager;
  fileManagerOpts?: FileManagerOpts;
  smokerOpts?: SmokerOptions;
}

export type NamedRuleRunner = (
  installPath: string,
  opts?: SomeRuleOptions,
) => Promise<RuleResultOk | RuleResultFailed[]>;

export type RuleRunner = (
  name: string,
  installPath: string,
  opts?: SomeRuleOptions,
) => Promise<RuleResultOk | RuleResultFailed[]>;

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
 * @param fn Plugin factory function
 * @param name Rule name
 * @returns Rule runner function (can only run the rule specified by the `name`
 *   parameter)
 */
export async function createRuleRunner(
  fn: PluginFactory,
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
 * @param fn Plugin factory function
 * @returns Rule runner function (can run any rule defined by the plugin
 *   factory)
 */
export async function createRuleRunner(fn: PluginFactory): Promise<RuleRunner>;

export async function createRuleRunner(fn: PluginFactory, name?: string) {
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
    await fn(pluginApi);
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
): Promise<RuleResultOk | RuleResultFailed[]> {
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
  return head(output)!.result;
}
