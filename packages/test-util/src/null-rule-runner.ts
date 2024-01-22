/**
 * This is a "null" {@link RuleRunner.RuleRunner} that can be used for testing.
 *
 * It does not run any rules, nor does it call notifiers.
 *
 * It resolve with a {@link RuleRunner.RunRulesResult} with no errors and a
 * `RuleOk` for each rule and each item in `runRulesManifest`
 *
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import {EventEmitter} from 'events';
import {type RuleEvents, type StrictEmitter} from 'midnight-smoker/event';
import {type PluginRegistry, type RuleFilter} from 'midnight-smoker/plugin';
import {
  RuleContext,
  type BaseRuleOptionsRecord,
  type RuleOk,
} from 'midnight-smoker/rule';
import {
  createRuleRunnerNotifiers,
  type RuleRunner,
  type RunRulesManifest,
  type RunRulesResult,
} from 'midnight-smoker/rule-runner';

export const nullRuleRunner: RuleRunner = async (
  notifiers,
  rules,
  ruleConfig,
  runRulesManifest,
): Promise<RunRulesResult> => {
  // this is where we would emit RunRulesBegin:
  // await Promise.resolve();
  // const total = rules.length;
  // notifiers.runRulesBegin({
  //   config: ruleConfig,
  //   total,
  // });

  const passed: RuleOk[] = [];

  await Promise.all(
    rules.map(async (rule, current) => {
      for (const {installPath, pkgName} of runRulesManifest) {
        // emit RunRuleBegin:
        // notifiers.ruleBegin({
        //   rule: rule.id,
        //   config: ruleConfig[rule.id],
        //   current,
        //   total,
        //   installPath,
        //   pkgName,
        // });

        // TODO: create a static rule context by hand here instead of calling out
        const context = RuleContext.create(rule, {
          severity: 'error',
          installPath,
          pkgJson: {name: 'null', version: '1.0.0'},
          pkgJsonPath: '/some/package.json',
        });

        // this would be where the rule actually gets run.
        await Promise.resolve();

        // emit RunRuleOk / RunRuleFailed:
        // notifiers.ruleOk({
        //   installPath,
        //   pkgName,
        //   rule: rule.id,
        //   config: ruleConfig[rule.id],
        //   current,
        //   total,
        // });

        passed.push({rule: rule.toJSON(), context: context.toJSON()});
      }
    }),
  );

  // emit RunRulesOk:
  // notifiers.runRulesOk({
  //   config: ruleConfig,
  //   total,
  //   passed,
  // });

  return {issues: [], passed};
};

/**
 * Options for running a rule runner.
 */
export interface RunRuleRunnerOpts {
  /**
   * The rules to run. If not provided, all rules will be run. If `filter`
   * provided, this is ignored.
   */
  rules?: string[];

  /**
   * The configuration options for the rules to run. If not provided, the
   * default configuration will be used.
   */
  config?: BaseRuleOptionsRecord;

  /**
   * The event emitter to use for emitting events (via the notifier functions).
   * If not provided, a new `EventEmitter` will be created.
   */
  emitter?: EventEmitter;
  /**
   * Filter the rules to run (e.g., only those that are not disabled)
   */
  filter?: RuleFilter;
}

/**
 * Runs the provided rule runner with the given manifest and options.
 *
 * The {@link RuleRunner} _and_ the rules must be registered with the provided
 * {@link PluginRegistry}.
 *
 * @param ruleRunner - The rule runner function to execute.
 * @param registry - Plugin registry.
 * @param manifest - The manifest containing information about the rules to run.
 * @param opts - The optional configuration options for running the rule runner.
 * @returns A promise that resolves when the rule runner has completed.
 */
export async function runRuleRunner(
  ruleRunner: RuleRunner,
  registry: PluginRegistry,
  manifest: RunRulesManifest,
  opts: RunRuleRunnerOpts = {},
): Promise<RunRulesResult> {
  const notifiers = createRuleRunnerNotifiers(
    (opts.emitter ?? new EventEmitter()) as StrictEmitter<RuleEvents>,
  );

  const filter: RuleFilter = opts.filter
    ? opts.filter
    : opts.rules
      ? (rule) => Boolean(opts.rules?.includes(rule.name))
      : () => true;
  return ruleRunner(
    notifiers,
    registry.getRules(filter),
    opts.config ?? registry.mergeRuleDefaults(),
    manifest,
  );
}
