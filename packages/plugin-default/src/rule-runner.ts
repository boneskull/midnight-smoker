/**
 * Provides the default implementation of a {@link RuleRunner}.
 *
 * This is implemented as a class just because a) it was a class before I
 * refactored it, and b) if it wasn't a class, it'd just be a pile of loose
 * functions.
 *
 * The wrapper is a little different than the other built-in components because
 * it wants the `PluginAPI` object from the plugin entry point to access some
 * helpers functions.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import {type Component} from 'midnight-smoker/component';
import {type PluginAPI} from 'midnight-smoker/plugin';
import {
  type BaseNormalizedRuleOptionsRecord,
  type Rule,
  type RuleConfig,
  type RuleContext,
  type RuleDefSchemaValue,
  type RuleIssue,
  type RuleOk,
  type SomeRule,
} from 'midnight-smoker/rule';
import {
  RuleError,
  createRuleContext,
  createRuleOkResult,
  getConfigForRule,
  type RuleRunner,
  type RuleRunnerNotifiers,
  type RunRulesManifest,
  type RunRulesResult,
} from 'midnight-smoker/rule-runner';

const debug = Debug('midnight-smoker:plugin-default:rule-runner');

export class SmokerRuleRunner<T extends BaseNormalizedRuleOptionsRecord> {
  protected constructor(
    protected readonly notifiers: RuleRunnerNotifiers,
    protected readonly rules: Component<SomeRule>[],
    protected readonly rulesConfig: T,
  ) {}

  public static create(
    this: void,
    notifiers: RuleRunnerNotifiers,
    rules: Component<SomeRule>[],
    ruleConfig: BaseNormalizedRuleOptionsRecord,
  ) {
    return new SmokerRuleRunner(notifiers, rules, ruleConfig);
  }

  /**
   * Given the {@link RunRulesManifest} object, run all rules as configured
   * against each installed package in the results.
   */
  public async runAll(
    runRulesManifest: RunRulesManifest,
  ): Promise<RunRulesResult> {
    const allIssues: RuleIssue[] = [];
    const allOk: RuleOk[] = [];
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
        const config = getConfigForRule(rule, this.rulesConfig);

        // XXX: this needs to be in the loop, but the installPath has to be in the object

        for (const {installPath, pkgName} of runRulesManifest) {
          this.notifiers.ruleBegin({
            rule: rule.id,
            config,
            current,
            total,
            installPath,
            pkgName,
          });
          // TODO: create a `withContext()` helper that performs the next 3 operations
          const context = await createRuleContext(rule, installPath, config);
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
              installPath,
              pkgName,
            });
            allIssues.push(...issues);
          } else {
            this.notifiers.ruleOk({
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
    Schema extends RuleDefSchemaValue | void = void,
  >(
    this: void,
    context: Readonly<RuleContext>,
    rule: Rule<Name, Schema>,
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

const smokerRuleRunner: RuleRunner = async (
  notifiers,
  rules,
  ruleConfig,
  installResults,
) => {
  return SmokerRuleRunner.create(notifiers, rules, ruleConfig).runAll(
    installResults,
  );
};

/**
 * Creates a {@link RuleRunner} and registers it with the plugin API.
 *
 * @param api - Plugin API
 * @returns The `RuleRunner` itself
 */
export function loadRuleRunner(api: PluginAPI) {
  api.defineRuleRunner(smokerRuleRunner);
}
