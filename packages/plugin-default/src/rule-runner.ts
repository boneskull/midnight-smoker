/**
 * Provides the default implementation of a {@link RuleRunner}.
 *
 * This is implemented as a class just because a) it was a class before I
 * refactored it, and b) if it wasn't a class, it'd just be a pile of loose
 * functions.
 *
 * The wrapper is a little different than the other builtin components because
 * it wants the `PluginAPI` object from the plugin entry point to access some
 * helpers functions.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import {
  Component,
  type PluginAPI,
  type Rule,
  type RuleRunner,
} from 'midnight-smoker/plugin';

const debug = Debug('midnight-smoker:plugin-default:rule-runner');

export class SmokerRuleRunner<T extends Rule.BaseNormalizedRuleOptionsRecord> {
  protected constructor(
    protected readonly notifiers: RuleRunner.RuleRunnerNotifiers,
    protected readonly rules: Component<Rule.SomeRule>[],
    protected readonly rulesConfig: T,
    protected readonly api: PluginAPI,
  ) {}

  public static create(
    this: void,
    notifiers: RuleRunner.RuleRunnerNotifiers,
    rules: Component<Rule.SomeRule>[],
    ruleConfig: Rule.BaseNormalizedRuleOptionsRecord,
    api: PluginAPI,
  ) {
    return new SmokerRuleRunner(notifiers, rules, ruleConfig, api);
  }

  /**
   * Given the {@link RunRulesManifest} object, run all rules as configured
   * against each installed package in the results.
   */
  public async runAll(
    runRulesManifest: RuleRunner.RunRulesManifest,
  ): Promise<RuleRunner.RunRulesResult> {
    const allIssues: Rule.RuleIssue[] = [];
    const allOk: Rule.RuleOk[] = [];
    const rulesConfig = this.rulesConfig;

    const runnableRules = this.rules;

    const total = runnableRules.length;

    // avoid emitting synchronously
    await Promise.resolve();
    this.notifiers.runRulesBegin({
      config: rulesConfig,
      total,
    });

    await Promise.all(
      runnableRules.map(async (rule, current) => {
        const config = this.api.Helpers.getConfigForRule(
          rule,
          this.rulesConfig,
        );

        this.notifiers.ruleBegin({
          rule: rule.id,
          config,
          current,
          total,
        });

        for (const installPath of runRulesManifest) {
          // TODO: create a `withContext()` helper that performs the next 3 operations
          const context = await this.api.Helpers.createRuleContext(
            rule,
            installPath,
            config,
          );
          await SmokerRuleRunner.runRule(context, rule, config);
          const issues = context.finalize();

          if (issues?.length) {
            // XXX: unsure if it's kosher to do this synchronously..
            // this was in run() but moved it here because I wanted run() to be
            // static.
            // also consider combining multiple errors per rule into an AggregateError
            for (const issue of issues) {
              if (issue.error) {
                this.notifiers.ruleError(issue.error);
              }
            }

            this.notifiers.ruleFailed({
              rule: rule.id,
              config,
              current,
              total,
              failed: issues.map((issue) => issue.toJSON()),
            });
            allIssues.push(...issues);
          } else {
            this.notifiers.ruleOk({
              rule: rule.id,
              config,
              current,
              total,
            });
            allOk.push(this.api.Helpers.createRuleOkResult(rule, context));
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
      this.notifiers.runRulesFailed({
        ...evtData,
        failed: allIssues.map((issue) => issue.toJSON()),
      });
    } else {
      this.notifiers.runRulesOk(evtData);
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
  public static async runRule<
    const Name extends string,
    Schema extends Rule.RuleOptionSchema | void = void,
  >(
    this: void,
    context: Readonly<Rule.RuleContext>,
    rule: Rule.Rule<Name, Schema>,
    config: Rule.RuleConfig<Schema>,
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
        throw new TypeError(
          `Rule "${ruleName}" rejected with a non-Error: ${err}`,
        );
      }
    }
  }
}

/**
 * Creates a {@link RuleRunner} and registers it with the plugin API.
 *
 * @remarks
 * `RuleRunner` is returned for testing purposes only
 * @param api - Plugin API
 * @returns The `RuleRunner` itself
 */
export function loadRuleRunner(api: PluginAPI) {
  const smokerRuleRunner: RuleRunner.RuleRunner = async (
    notifiers,
    rules,
    ruleConfig,
    installResults,
  ) => {
    return SmokerRuleRunner.create(notifiers, rules, ruleConfig, api).runAll(
      installResults,
    );
  };
  api.defineRuleRunner(smokerRuleRunner);
  // return smokerRuleRunner;
}
