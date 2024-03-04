import {RuleError} from '#error/rule-error';
import {SmokerEvent} from '#event/event-constants';
import {type SmokerEventBus} from '#event/smoker-events';
import {type SomePkgManager} from '#pkg-manager/pkg-manager';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {
  RuleContext,
  type BaseNormalizedRuleOptions,
  type BaseNormalizedRuleOptionsRecord,
  type Rule,
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
import {type Controller} from './controller';

const debug = Debug('midnight-smoker:controller:lint-controller');

export type PluginRuleDef = [
  plugin: Readonly<PluginMetadata>,
  def: SomeRuleDef,
];

export class LintController<T extends BaseNormalizedRuleOptionsRecord>
  implements Controller
{
  public rules: SomeRule[] = [];

  protected constructor(
    private readonly eventBus: SmokerEventBus,
    private readonly pkgManagers: SomePkgManager[],
    protected readonly pluginRuleDefs: PluginRuleDef[],
    protected readonly rulesConfig: T,
  ) {}

  @once
  public async init() {
    this.rules = LintController.loadRules(this.pluginRuleDefs);
  }

  public static loadRules(pluginRuleDefs: PluginRuleDef[]): SomeRule[] {
    return pluginRuleDefs.map(([plugin, def]) => plugin.addRule(def));
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

  public static create<T extends BaseNormalizedRuleOptionsRecord>(
    this: void,
    eventBus: SmokerEventBus,
    pkgManagers: SomePkgManager[],
    pluginRuleDefs: PluginRuleDef[],
    rulesConfig: T,
  ) {
    return new LintController(
      eventBus,
      pkgManagers,
      pluginRuleDefs,
      rulesConfig,
    );
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
    };
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
   * /** Given the {@link RunRulesManifest} object, run all rules as configured
   * against each installed package in the results.
   */
  public async lint() // runRulesManifest: RunRulesManifest,
  : Promise<LintResult> {
    const allIssues: RuleIssue[] = [];
    const allOk: RuleOk[] = [];
    const rulesConfig = this.rulesConfig;
    const runnableRules = this.rules;
    const total = runnableRules.length;

    await this.eventBus.emit(SmokerEvent.RunRulesBegin, {
      config: rulesConfig,
      total,
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
          await this.eventBus.emit(SmokerEvent.RunRuleBegin, {
            rule: rule.id,
            config,
            current,
            total,
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

            await this.eventBus.emit(SmokerEvent.RunRuleFailed, {
              rule: rule.id,
              config,
              current,
              total,
              failed: issues.map((issue) => issue.toJSON()),
              installPath,
              pkgName,
            });
            allIssues.push(...issues);
          } else {
            await this.eventBus.emit(SmokerEvent.RunRuleOk, {
              rule: rule.id,
              config,
              current,
              total,
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
      await this.eventBus.emit(SmokerEvent.RunRulesFailed, {
        ...evtData,
        failed: allIssues.map((issue) => issue.toJSON()),
      });
    } else {
      await this.eventBus.emit(SmokerEvent.RunRulesOk, evtData);
    }

    debug('Finished running %d rules', this.rules.length);

    return {
      issues,
      passed,
    };
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
}
