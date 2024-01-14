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
import {Rule, type RuleRunner} from 'midnight-smoker/plugin';

export const nullRuleRunner: RuleRunner.RuleRunner = async (
  notifiers,
  rules,
  ruleConfig,
  runRulesManifest,
): Promise<RuleRunner.RunRulesResult> => {
  // this is where we would emit RunRulesBegin:
  // await Promise.resolve();
  // const total = rules.length;
  // notifiers.runRulesBegin({
  //   config: ruleConfig,
  //   total,
  // });

  const passed: Rule.RuleOk[] = [];

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
        const context = Rule.RuleContext.create(rule, {
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
