import {BaseNormalizedRuleOptionsRecordSchema} from '#schema/rule-options.js';
import {RunRulesManifestSchema} from '#schema/rule-runner-manifest.js';
import {RuleRunnerNotifiersSchema} from '#schema/rule-runner-notifier.js';
import {RunRulesResultSchema} from '#schema/rule-runner-result.js';
import {z} from 'zod';
import {RuleComponentsSchema} from './rule';

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
    RuleComponentsSchema,
    BaseNormalizedRuleOptionsRecordSchema,
    RunRulesManifestSchema,
  ] as [
    notifiers: typeof RuleRunnerNotifiersSchema,
    rules: typeof RuleComponentsSchema,
    ruleConfig: typeof BaseNormalizedRuleOptionsRecordSchema,
    runRulesManifest: typeof RunRulesManifestSchema,
  ]),
  z.promise(RunRulesResultSchema),
);
