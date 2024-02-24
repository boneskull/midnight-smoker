import {type RuleEvent} from '#event';
import {StaticRuleIssueSchema} from '#schema/rule-issue-static';
import {
  BaseNormalizedRuleOptionsRecordSchema,
  BaseNormalizedRuleOptionsSchema,
} from '#schema/rule-options';
import {RuleOkSchema} from '#schema/rule-result';
import {
  NonEmptyStringSchema,
  NonNegativeIntSchema,
  instanceofSchema,
  serializeObject,
} from '#util/schema-util';
import {z} from 'zod';
import {RuleError} from '../../error/rule-error';

export type RunRulesBeginEventData = z.infer<
  typeof RunRulesBeginEventDataSchema
>;
export type RunRuleEventData = z.infer<typeof RuleEventDataSchema>;

export type RunRuleBeginEventData = RunRuleEventData;

export type RunRuleOkEventData = RunRuleEventData;

export type RunRuleFailedEventData = z.infer<typeof RuleFailedEventDataSchema>;

export type RunRulesFailedEventData = z.infer<
  typeof RunRulesFailedEventDataSchema
>;
export type RunRulesOkEventData = z.infer<typeof RunRulesOkEventDataSchema>;

export type RuleErrorEventData = z.infer<typeof RuleErrorEventDataSchema>;
export const RunRulesBeginEventDataSchema = z.object({
  config: BaseNormalizedRuleOptionsRecordSchema.describe(
    'The entire rule configuration, as defined by the user and default values',
  ),
  total: NonNegativeIntSchema.describe('Total count of unique rules'),
});

export const RuleEventDataSchema = z
  .object({
    rule: NonEmptyStringSchema.describe('ID of the rule to run'),
    config: BaseNormalizedRuleOptionsSchema.describe(
      'Specific rule configuration',
    ),
    current: NonNegativeIntSchema.describe(
      'Current rule position in the total',
    ),
    total: NonNegativeIntSchema.describe('Total count of unique rules'),
    installPath: NonEmptyStringSchema.describe(
      'Install path of package being checked',
    ),
    pkgName: NonEmptyStringSchema.describe('Name of package being checked'),
  })
  .describe('Base object for RunRule* events');

export const RuleBeginEventDataSchema = RuleEventDataSchema;

export const RuleOkEventDataSchema = RuleEventDataSchema;

export const RuleFailedEventDataSchema = RuleEventDataSchema.setKey(
  'failed',
  z
    .array(serializeObject(StaticRuleIssueSchema))
    .describe('List of issues raised by a single rule exection'),
);

export const RunRulesOkEventDataSchema = RunRulesBeginEventDataSchema.setKey(
  'passed',
  z.array(RuleOkSchema).describe('List of rules which ran without issue'),
);
// FIXME: "failed" should be "issues" since some may be warnings
export const RunRulesFailedEventDataSchema = RunRulesOkEventDataSchema.setKey(
  'failed',
  z.array(StaticRuleIssueSchema).describe('List of issues raised by all rules'),
);

export const RuleErrorEventDataSchema = z.object({
  error: instanceofSchema(RuleError),
});

export type RuleEventData = {
  [RuleEvent.RunRuleBegin]: RunRuleBeginEventData;
  [RuleEvent.RunRuleOk]: RunRuleOkEventData;
  [RuleEvent.RunRuleFailed]: RunRuleFailedEventData;
  [RuleEvent.RunRulesBegin]: RunRulesBeginEventData;
  [RuleEvent.RunRulesOk]: RunRulesOkEventData;
  [RuleEvent.RunRulesFailed]: RunRulesFailedEventData;
  [RuleEvent.RuleError]: RuleErrorEventData;
};
