import {
  ComponentKinds,
  DEFAULT_PKG_MANAGER_BIN,
  DEFAULT_PKG_MANAGER_VERSION,
} from 'midnight-smoker/constants';
import {PluginInitError} from 'midnight-smoker/error';
import {
  RuleMachine,
  xstate,
  type CheckOutput,
  type RuleMachineCheckEvent,
  type RuleMachineInput,
} from 'midnight-smoker/machine';
import {
  PluginMetadata,
  createPluginAPI,
  type PluginFactory,
} from 'midnight-smoker/plugin';
import {
  BaseRuleConfigSchema,
  DEFAULT_RULE_SEVERITY,
  getDefaultRuleOptions,
  type RuleConfig,
  type RuleOptions,
  type SomeRuleConfig,
  type SomeRuleDef,
  type SomeRuleOptions,
  type StaticRuleContext,
} from 'midnight-smoker/rule';
import {type LintManifest} from 'midnight-smoker/schema';
import {fromUnknownError} from 'midnight-smoker/util';

const DEFAULT_PKG_MANAGER_SPEC = `${DEFAULT_PKG_MANAGER_BIN}@${DEFAULT_PKG_MANAGER_VERSION}`;

/**
 * Extra knobs to fiddle for {@link RuleRunner running a rule}.
 */
export type RuleRunnerOptions = {
  ruleContext?: Partial<StaticRuleContext>;
  lintManifest?: Partial<LintManifest>;
  signal?: AbortSignal;
};

/**
 * A rule runner function which can only run a single rule.
 *
 * @see {@link createRuleRunner}
 */
export type NamedRuleRunner = (
  installPath: string,
  ruleOptions?: SomeRuleOptions | SomeRuleConfig,
  ruleRunnerOptions?: RuleRunnerOptions,
) => Promise<CheckOutput>;

/**
 * A rule runner function which can run any rule defined by the plugin factory.
 *
 * @see {@link createRuleRunner}
 */
export type RuleRunner = (
  name: string,
  installPath: string,
  ruleOptions?: SomeRuleOptions | SomeRuleConfig,
  ruleRunnerOptions?: RuleRunnerOptions,
) => Promise<CheckOutput>;

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

  return async (
    name: string,
    installPath: string,
    ruleOptions?: SomeRuleOptions,
    ruleRunnerOptions?: RuleRunnerOptions,
  ) => {
    const def = ruleDefs.get(name);
    if (!def) {
      throw new ReferenceError(`RuleDef "${name}" not found`);
    }
    return runRule(def, installPath, ruleOptions, ruleRunnerOptions);
  };
}

/**
 * Given a rule definition, runs the rule against a package dir with the
 * specified options (if given).
 *
 * @param def Rule definition
 * @param cwd Path to package dir to test
 * @param ruleOptions Rule-specific options
 * @param ruleRunnerOptions More knobs to twiddle
 * @returns A {@link CheckOutput} object
 */
export async function runRule<T extends SomeRuleDef>(
  def: T,
  cwd: string,
  ruleOptions?:
    | Partial<RuleOptions<T['schema']>>
    | Partial<RuleConfig<T['schema']>>,
  {ruleContext, lintManifest}: RuleRunnerOptions = {},
): Promise<CheckOutput> {
  /**
   * This tells the rule machine to run only one check then exit.
   */
  const plan: RuleMachineInput['plan'] = 1;
  const {schema} = def;

  const defaultRuleOptions: RuleOptions<typeof schema> = schema
    ? getDefaultRuleOptions(schema)
    : {};

  const isConfig = (
    value?: unknown,
  ): value is Partial<RuleConfig<typeof schema>> =>
    BaseRuleConfigSchema.partial().safeParse(ruleOptions).success;

  const config = isConfig(ruleOptions)
    ? {
        opts: {...defaultRuleOptions, ...ruleOptions.opts},
        severity: ruleOptions.severity ?? DEFAULT_RULE_SEVERITY,
      }
    : {
        opts: {...defaultRuleOptions, ...ruleOptions},
        severity: DEFAULT_RULE_SEVERITY,
      };

  const ruleId: StaticRuleContext['ruleId'] = ruleContext?.ruleId ?? def.name;

  const ctx: StaticRuleContext = {
    installPath: cwd,
    pkgName: '',
    pkgJson: {},
    pkgJsonPath: '',
    severity: config.severity,
    pkgManager: DEFAULT_PKG_MANAGER_SPEC,
    ...ruleContext,
    ruleId,
    workspace: {
      localPath: '',
      pkgName: '',
      pkgJson: {},
      pkgJsonPath: '',
    },
  };

  const manifest: LintManifest = {
    installPath: cwd,
    pkgJsonPath: '',
    pkgJson: {},
    pkgName: '',
    ...lintManifest,
    workspace: {
      localPath: '',
      pkgName: '',
      pkgJson: {},
      pkgJsonPath: '',
      ...lintManifest?.workspace,
    },
  };

  const input: RuleMachineInput = {
    def,
    ruleId,
    config,
    plan,
  };

  const checkEvent: RuleMachineCheckEvent = {type: 'CHECK', ctx, manifest};

  const ruleMachine = xstate.createActor(RuleMachine, {input});

  const machinePromise = xstate.toPromise(ruleMachine);

  ruleMachine.start().send(checkEvent);

  return machinePromise.then(({results}) => results[0]);
}
