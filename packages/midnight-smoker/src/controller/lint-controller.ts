import {RuleError} from '#error/rule-error';
import {SmokerEvent} from '#event/event-constants';
import {type SmokerEventBus} from '#event/smoker-events';
import {type SomePkgManager} from '#pkg-manager/pkg-manager';
import {type PluginMetadata, type PluginRegistry} from '#plugin';
import {
  Rule,
  RuleContext,
  type BaseNormalizedRuleOptions,
  type BaseNormalizedRuleOptionsRecord,
  type RuleConfig,
  type RuleDefSchemaValue,
  type RuleIssue,
  type RuleOk,
  type RuleSeverity,
  type SomeRule,
  type SomeRuleDef,
  type StaticRuleContext,
} from '#rule';
import {type LintResult} from '#schema/lint-result';
import {once} from '#util';
import {readPackageJson} from '#util/pkg-util';
import Debug from 'debug';
import {uniqBy} from 'lodash';
import {ComponentKinds} from '../constants';
import {type Controller} from './controller';

export type PluginRuleDef = [
  plugin: Readonly<PluginMetadata>,
  def: SomeRuleDef,
];

export class LintController implements Controller {
  public rules: SomeRule[] = [];

  protected constructor(
    private readonly pluginRegistry: PluginRegistry,
    private readonly eventBus: SmokerEventBus,
    private readonly pkgManagers: SomePkgManager[],
    protected readonly pluginRuleDefs: PluginRuleDef[],
    protected readonly rulesConfig: BaseNormalizedRuleOptionsRecord,
  ) {}

  public static create(
    this: void,
    pluginRegistry: PluginRegistry,
    eventBus: SmokerEventBus,
    pkgManagers: SomePkgManager[],
    pluginRuleDefs: PluginRuleDef[],
    rulesConfig: BaseNormalizedRuleOptionsRecord,
  ) {
    return new LintController(
      pluginRegistry,
      eventBus,
      pkgManagers,
      pluginRuleDefs,
      rulesConfig,
    );
  }

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
   * @internal
   */
  public static async createRuleContext<
    Cfg extends BaseNormalizedRuleOptions = BaseNormalizedRuleOptions,
  >(
    this: void,
    rule: SomeRule,
    installPath: string,
    ruleConfig: Cfg,
  ): Promise<Readonly<RuleContext>> {
    const {severity} = ruleConfig;
    const staticCtx = await LintController.createStaticRuleContext(
      installPath,
      severity,
    );
    return RuleContext.create(rule, staticCtx);
  }

  /**
   * Creates a RuleOk result object.
   *
   * @param rule - The rule object.
   * @param context - The context object.
   * @returns The RuleOk result.
   * @internal
   */
  public static createRuleOkResult(
    this: void,
    rule: SomeRule,
    context: Readonly<RuleContext>,
  ): RuleOk {
    return {rule: rule.toJSON(), context: context.toJSON()};
  }

  /**
   * Creates a {@link StaticRuleContext}; used by {@link createRuleContext}
   *
   * @param installPath - Path to package which will be provided to Rule
   * @param severity - Rule Severity
   * @returns
   * @internal
   */
  public static async createStaticRuleContext(
    this: void,
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
      pkgName: 'dooop',
    };
  }

  public static loadRules(
    this: void,
    pluginRegistry: PluginRegistry,
    pluginRuleDefs: PluginRuleDef[],
  ): SomeRule[] {
    return pluginRuleDefs.map(([plugin, def]) => {
      const {id, componentName} = pluginRegistry.getComponent(def);
      const rule = Rule.create(id, def, plugin);
      pluginRegistry.registerComponent(
        plugin,
        ComponentKinds.Rule,
        rule,
        rule.name ?? componentName,
      );
      return rule;
    });
  }

  /**
   * Executes the `check` function of a single {@link Rule}
   *
   * @param context - Rule execution context
   * @param rule - Some `Rule`
   * @param ruleOpts - Parsed rule options
   * @returns Results of a single check
   */
  public static async runRule<Schema extends RuleDefSchemaValue | void = void>(
    this: void,
    context: Readonly<RuleContext>,
    rule: Rule<Schema>,
    config: RuleConfig<Schema>,
  ): Promise<void> {
    const {name: ruleName} = rule;

    try {
      debug(
        'Running rule %s with context %O and config %O',
        ruleName,
        context.toJSON(),
        config,
      );
      await rule.check(context, config.opts);
    } catch (err) {
      if (err instanceof Error) {
        context.addIssueFromError(err);
        /* istanbul ignore next */
      } else {
        throw new RuleError(
          `Rule "${ruleName}" rejected with a non-Error: ${err}`,
          context,
          ruleName,
          err as Error,
        );
      }
    }
  }

  /**
   * Retrieves the configuration for a specific rule.
   *
   * @template Schema - The schema type of the rule, if any.
   * @param rule - The rule component.
   * @returns The readonly configuration for the rule.
   * @internal
   */
  public getConfigForRule<Schema extends RuleDefSchemaValue | void = void>(
    rule: Rule<Schema>,
  ): Readonly<RuleConfig<Schema>> {
    return Object.freeze({...this.rulesConfig[rule.id]}) as Readonly<
      RuleConfig<Schema>
    >;
  }

  @once
  public async init() {
    this.rules = LintController.loadRules(
      this.pluginRegistry,
      this.pluginRuleDefs,
    );
  }

  /**
   * /** Given the {@link LintManifest} object, run all rules as configured
   * against each installed package in the results.
   */
  public async lint() // runRulesManifest: LintManifest,
  : Promise<LintResult> {
    const allIssues: RuleIssue[] = [];
    const allOk: RuleOk[] = [];
    const rulesConfig = this.rulesConfig;
    const runnableRules = this.rules;
    const total = runnableRules.length;

    await this.eventBus.emit(SmokerEvent.LintBegin, {
      config: rulesConfig,
      totalRules: total,
      // @ts-expect-error ugh
      totalChecks: 0,
    });

    const lintManifests = uniqBy(
      this.pkgManagers.flatMap((pkgManager) => pkgManager.pkgInstallManifests),
      'pkgName',
    );

    await Promise.all(
      runnableRules.map(async (rule, current) => {
        const config = this.getConfigForRule(rule);

        // XXX: this needs to be in the loop, but the installPath has to be in the object

        for (const {installPath, pkgName} of lintManifests) {
          await this.eventBus.emit(SmokerEvent.RuleBegin, {
            rule: rule.id,
            config,
            currentRule: current,
            totalRules: total,
            installPath,
            pkgName,
          });
          // TODO: create a `withContext()` helper that performs the next 3 operations
          const context = await LintController.createRuleContext(
            rule,
            installPath,
            config,
          );
          await LintController.runRule(context, rule, config);
          const issues = context.finalize();

          if (issues?.length) {
            // XXX: unsure if it's kosher to do this synchronously..
            // this was in run() but moved it here because I wanted run() to be
            // static.
            // also consider combining multiple errors per rule into an AggregateError
            for (const issue of issues) {
              if (issue.error) {
                await this.eventBus.emit(SmokerEvent.RuleError, {
                  error: issue.error,
                });
              }
            }

            await this.eventBus.emit(SmokerEvent.RuleFailed, {
              rule: rule.id,
              config,
              currentRule: current,
              totalRules: total,
              issues: issues.map((issue) => issue.toJSON()),
              installPath,
              pkgName,
            });
            allIssues.push(...issues);
          } else {
            await this.eventBus.emit(SmokerEvent.RuleOk, {
              rule: rule.id,
              config,
              currentRule: current,
              totalRules: total,
              installPath,
              pkgName,
            });
            allOk.push(LintController.createRuleOkResult(rule, context));
          }
        }
      }),
    );

    const passed = allOk;
    const issues = allIssues;
    const config = rulesConfig;

    const evtData = {
      config,
      total,
      passed,
    };

    if (issues.length) {
      await this.eventBus.emit(SmokerEvent.LintFailed, {
        ...evtData,
        // @ts-expect-error derp
        totalChecks: 0,
        issues: allIssues.map((issue) => issue.toJSON()),
      });
    } else {
      await this.eventBus.emit(SmokerEvent.LintOk, {
        ...evtData,
        // @ts-expect-error derp
        totalChecks: 0,
      });
    }

    debug('Finished running %d rules', this.rules.length);

    return {
      issues,
      passed,
    };
  }
}

const debug = Debug('midnight-smoker:controller:lint-controller');
