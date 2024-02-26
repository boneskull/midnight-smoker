import {type SmokerEvents, type StrictEmitter} from '#event';
import {SmokerEvent} from '#event/event-constants';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {
  type BaseNormalizedRuleOptionsRecord,
  type Rule,
  type RuleConfig,
  type RuleContext,
  type RuleDefSchemaValue,
  type RuleIssue,
  type RuleOk,
  type SomeRule,
  type SomeRuleDef,
} from '#rule';
import {
  RuleError,
  createRuleContext,
  createRuleOkResult,
  getConfigForRule,
  type RunRulesManifest,
  type RunRulesResult,
} from '#rule-runner';
import Debug from 'debug';
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
    private readonly smoker: StrictEmitter<SmokerEvents>,
    protected readonly pluginRuleDefs: PluginRuleDef[],
    protected readonly rulesConfig: T,
  ) {}

  public async init() {
    this.rules = LintController.loadRules(this.pluginRuleDefs);
  }

  public static loadRules(pluginRuleDefs: PluginRuleDef[]): SomeRule[] {
    return pluginRuleDefs.map(([plugin, def]) => plugin.addRule(def));
  }

  public static create<T extends BaseNormalizedRuleOptionsRecord>(
    this: void,
    smoker: StrictEmitter<SmokerEvents>,
    pluginRuleDefs: PluginRuleDef[],
    rulesConfig: T,
  ) {
    return new LintController(smoker, pluginRuleDefs, rulesConfig);
  }

  /**
   * Given the {@link RunRulesManifest} object, run all rules as configured
   * against each installed package in the results.
   */
  public async lint(
    runRulesManifest: RunRulesManifest,
  ): Promise<RunRulesResult> {
    const allIssues: RuleIssue[] = [];
    const allOk: RuleOk[] = [];
    const rulesConfig = this.rulesConfig;

    const runnableRules = this.rules;

    const total = runnableRules.length;

    // avoid emitting synchronously
    await Promise.resolve();

    this.smoker.emit(SmokerEvent.RunRulesBegin, {config: rulesConfig, total});

    await Promise.all(
      runnableRules.map(async (rule, current) => {
        const config = getConfigForRule(rule, this.rulesConfig);

        // XXX: this needs to be in the loop, but the installPath has to be in the object

        for (const {installPath, pkgName} of runRulesManifest) {
          this.smoker.emit(SmokerEvent.RunRuleBegin, {
            rule: rule.id,
            config,
            current,
            total,
            installPath,
            pkgName,
          });
          // TODO: create a `withContext()` helper that performs the next 3 operations
          const context = await createRuleContext(rule, installPath, config);
          await LintController.runRule(context, rule, config);
          const issues = context.finalize();

          if (issues?.length) {
            // XXX: unsure if it's kosher to do this synchronously..
            // this was in run() but moved it here because I wanted run() to be
            // static.
            // also consider combining multiple errors per rule into an AggregateError
            for (const issue of issues) {
              if (issue.error) {
                this.smoker.emit(SmokerEvent.RuleError, {error: issue.error});
              }
            }

            this.smoker.emit(SmokerEvent.RunRuleFailed, {
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
            this.smoker.emit(SmokerEvent.RunRuleOk, {
              rule: rule.id,
              config,
              current,
              total,
              installPath,
              pkgName,
            });
            allOk.push(createRuleOkResult(rule, context));
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
      this.smoker.emit(SmokerEvent.RunRulesFailed, {
        ...evtData,
        failed: allIssues.map((issue) => issue.toJSON()),
      });
    } else {
      this.smoker.emit(SmokerEvent.RunRulesOk, evtData);
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
   * @internal
   */
  private static async runRule<Schema extends RuleDefSchemaValue | void = void>(
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
