import {isEmpty} from 'lodash';
import {
  ComponentKinds,
  DEFAULT_PKG_MANAGER_NAME,
  DEFAULT_PKG_MANAGER_VERSION,
} from 'midnight-smoker/constants';
import {PluginInitError} from 'midnight-smoker/error';
import {
  type LintLogicOutput,
  queryWorkspacesLogic,
  RuleMachine,
  type RuleMachineCheckEvent,
  type RuleMachineInput,
  xstate,
} from 'midnight-smoker/machine';
import {
  createPluginAPI,
  type PluginFactory,
  PluginMetadata,
  type RegisterComponentFn,
} from 'midnight-smoker/plugin';
import {
  BaseRuleConfigSchema,
  DEFAULT_RULE_SEVERITY,
  getDefaultRuleOptions,
  type LintManifest,
  type RuleConfig,
  type RuleOptions,
  type SomeRule,
  type SomeRuleConfig,
  type SomeRuleOptions,
  type StaticRuleContext,
} from 'midnight-smoker/rule';
import {fromUnknownError} from 'midnight-smoker/util';

import {createDebug} from './debug';

const DEFAULT_PKG_MANAGER_SPEC = `${DEFAULT_PKG_MANAGER_NAME}@${DEFAULT_PKG_MANAGER_VERSION}`;

/**
 * Extra knobs to fiddle for {@link RuleRunner running a rule}.
 */
export type RuleRunnerOptions = {
  lintManifest?: Partial<LintManifest>;
  ruleContext?: Partial<StaticRuleContext>;
  signal?: AbortSignal;
};

/**
 * A rule runner function which can only run a single rule.
 *
 * @see {@link createRuleRunner}
 */
export type NamedRuleRunner = (
  installPath: string,
  ruleOptions?: SomeRuleConfig | SomeRuleOptions,
  ruleRunnerOptions?: RuleRunnerOptions,
) => Promise<LintLogicOutput>;

/**
 * A rule runner function which can run any rule defined by the plugin factory.
 *
 * @param name Rule name
 * @param installPath Filepath of the package to test
 * @param ruleOptions Rule-specific options (or config; e.g. `opts` and
 *   `severity`)
 * @param ruleRunnerOptions Extra fancy options
 * @see {@link createRuleRunner}
 */
export type RuleRunner = (
  name: string,
  installPath: string,
  ruleOptions?: SomeRuleConfig | SomeRuleOptions,
  ruleRunnerOptions?: RuleRunnerOptions,
) => Promise<LintLogicOutput[]>;

/**
 * Factory function which creates a {@link NamedRuleRunner}.
 *
 * Since a {@link PluginFactory} can define multiple rules, this function allows
 * you to specify which rule to run.
 *
 * If you wish to test multiple rules, omit the `name` parameter; you will
 * receive a {@link RuleRunner} instead (of a {@link NamedRuleRunner}).
 *
 * _If you have a `Rule` instead of a `PluginFactory`_, you can use
 * {@link runRule} directly.
 *
 * @param factory Plugin factory function
 * @param name Rule name
 * @returns Named rule runner function (can only run the rule specified by the
 *   `name` parameter); returns a single result
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
 * second parameter; you will receive a {@link NamedRuleRunner} instead.
 *
 * _If you have a `Rule` instead of a `PluginFactory`_, you can use
 * {@link runRule} instead.
 *
 * @param factory Plugin factory function
 * @returns Rule runner function (can run any rule defined by the plugin
 *   factory); returns an array of results
 */
export async function createRuleRunner(
  factory: PluginFactory,
): Promise<RuleRunner>;

export async function createRuleRunner(factory: PluginFactory, name?: string) {
  const rules: Map<string, SomeRule> = new Map();
  const metadata = PluginMetadata.createTransient('test-plugin');
  const registerComponent: RegisterComponentFn = (kind, componentObj, name) => {
    if (kind === ComponentKinds.Rule) {
      rules.set(name, componentObj as SomeRule);
    }
    // ignore everything else
  };
  const pluginApi = createPluginAPI(registerComponent, metadata);
  try {
    await factory(pluginApi);
  } catch (err) {
    throw new PluginInitError(fromUnknownError(err), metadata);
  }

  if (name) {
    const rule = rules.get(name);
    if (!rule) {
      throw new ReferenceError(`Rule "${name}" not found`);
    }
    return async (installPath: string, opts?: SomeRuleOptions) =>
      runRule(rule, installPath, opts).then((results) => results[0]);
  }

  return async (
    name: string,
    installPath: string,
    ruleOptions?: SomeRuleOptions,
    ruleRunnerOptions?: RuleRunnerOptions,
  ) => {
    const rule = rules.get(name);
    if (!rule) {
      throw new ReferenceError(`Rule "${name}" not found`);
    }
    return runRule(rule, installPath, ruleOptions, ruleRunnerOptions);
  };
}

/**
 * Given a rule definition, runs the rule against a package dir with the
 * specified options (if given).
 *
 * @param rule Rule
 * @param cwd Path to package dir to test
 * @param ruleOptions Rule-specific options
 * @param ruleRunnerOptions More knobs to twiddle
 * @returns A {@link LintLogicOutput} object
 */
export async function runRule<T extends SomeRule>(
  rule: T,
  cwd: string,
  ruleOptions?:
    | Partial<RuleConfig<T['schema']>>
    | Partial<RuleOptions<T['schema']>>,
  {lintManifest, ruleContext}: RuleRunnerOptions = {},
): Promise<LintLogicOutput[]> {
  /**
   * This tells the rule machine to run only one check then exit.
   */
  const plan: RuleMachineInput['plan'] = 1;
  const {schema} = rule;

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

  const ruleId: StaticRuleContext['ruleId'] = ruleContext?.ruleId ?? rule.name;

  const queryWSActor = xstate.createActor(queryWorkspacesLogic, {
    input: {all: false, cwd},
    logger: createDebug(__filename, 'queryWorkspacesLogic'),
  });

  const queryWSPromise = xstate.toPromise(queryWSActor);
  queryWSActor.start();
  const workspaces = await queryWSPromise;

  if (isEmpty(workspaces)) {
    throw new ReferenceError(`No workspaces found in "${cwd}"`);
  }
  const workspace = workspaces[0]!;

  const ctx: StaticRuleContext = {
    installPath: cwd,
    pkgJson: workspace.pkgJson,
    pkgJsonPath: workspace.pkgJsonPath,
    pkgManager: DEFAULT_PKG_MANAGER_SPEC,
    pkgName: workspace.pkgName,
    severity: config.severity,
    ...ruleContext,
    ruleId,
    workspace,
  };

  const manifest: LintManifest = {
    installPath: cwd,
    pkgJson: workspace.pkgJson,
    pkgJsonPath: workspace.pkgJsonPath,
    pkgName: workspace.pkgName,
    ...lintManifest,
    workspace,
  };

  const input: RuleMachineInput = {
    envelope: {
      config,
      id: ruleId,
      plugin: PluginMetadata.createTransient('test-plugin'),
      rule,
    },
    plan,
  };

  const checkEvent: RuleMachineCheckEvent = {ctx, manifest, type: 'CHECK'};

  const ruleMachine = xstate.createActor(RuleMachine, {
    input,
    logger: createDebug(__filename, 'RuleMachine'),
  });

  const machinePromise = xstate.toPromise(ruleMachine);

  ruleMachine.start().send(checkEvent);

  return machinePromise.then(({results}) => results);
}
