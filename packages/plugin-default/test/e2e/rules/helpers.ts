import {type SmokerOptions} from 'midnight-smoker';
import {
  ComponentKinds,
  DEFAULT_PKG_MANAGER_BIN,
  DEFAULT_PKG_MANAGER_VERSION,
} from 'midnight-smoker/constants';
import {PluginInitError, fromUnknownError} from 'midnight-smoker/error';
import {
  RuleMachine,
  createActor,
  toPromise,
  type CheckOutput,
} from 'midnight-smoker/machine';
import {
  PluginMetadata,
  type PluginFactory,
  type PluginRegistry,
} from 'midnight-smoker/plugin';
import {
  DEFAULT_RULE_SEVERITY,
  type RuleDefSchemaValue,
  type RuleOptions,
  type SomeRuleDef,
  type SomeRuleOptions,
} from 'midnight-smoker/rule';
import {type FileManager, type FileManagerOpts} from 'midnight-smoker/util';
import {createPluginAPI} from '../../../../midnight-smoker/src/plugin/create-plugin-api';
import {getDefaultRuleOptions} from '../../../../midnight-smoker/src/rule/create-rule-options';

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

export async function createRuleRunner(fn: PluginFactory) {
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

  return (name: string, installPath: string, opts?: SomeRuleOptions) => {
    const def = ruleDefs.get(name);
    if (!def) {
      throw new ReferenceError(`Rule "${name}" not found`);
    }
    return applyRule(def, installPath, opts);
  };
}

export function applyRule<T extends SomeRuleDef>(
  def: T,
  installPath: string,
  opts?: RuleOptions<T['schema']>,
): Promise<CheckOutput[]>;

export function applyRule<T extends SomeRuleDef>(
  def: T,
  installPath: string,
  opts?: RuleOptions<T['schema']>,
): Promise<CheckOutput[]> {
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
      plan: 1,
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
  return toPromise(ruleMachine);
}
