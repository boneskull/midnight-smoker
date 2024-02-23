import {SomeRulesSchema} from '#schema/rule';
import {BaseNormalizedRuleOptionsRecordSchema} from '#schema/rule-options';
import {RunRulesManifestSchema} from '#schema/rule-runner-manifest';
import {RuleRunnerNotifiersSchema} from '#schema/rule-runner-notifier';
import {RunRulesResultSchema} from '#schema/rule-runner-result';
import {z} from 'zod';

/**
 * @todo A RuleRunner should not need to return anything, since it operates
 *   solely by mutating `RuleContext` objects. This means get rid of the
 *   `RuleOk` schema, since we won't need it. `RuleOk` should be needed only for
 *   defining the `RunRuleOk` and/or `RunRulesOk` events. It may turn out that
 *   it is needed by these events, as I know there are some schemas for them--I
 *   just don't know why that'd be necessary (because I am too lazy to look
 *   right now)
 */

export type RuleRunner = z.infer<typeof RuleRunnerSchema>;
export const RuleRunnerSchema = z.function(
  z.tuple([
    RuleRunnerNotifiersSchema,
    SomeRulesSchema,
    BaseNormalizedRuleOptionsRecordSchema,
    RunRulesManifestSchema,
  ] as [
    notifiers: typeof RuleRunnerNotifiersSchema,
    rules: typeof SomeRulesSchema,
    ruleConfig: typeof BaseNormalizedRuleOptionsRecordSchema,
    runRulesManifest: typeof RunRulesManifestSchema,
  ]),
  z.promise(RunRulesResultSchema),
);
