import {RuleError} from '#error/rule-error';
import {type LintEvent} from '#event';
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
import {LintManifestSchema} from './lint-manifest';
import {PkgManagerEventBaseSchema} from './pkg-manager-event';

export type LintBeginEventData = z.infer<typeof LintBeginEventDataSchema>;

export type LintEventData = {
  [LintEvent.PkgManagerLintBegin]: PkgManagerLintBeginEventData;
  [LintEvent.PkgManagerLintOk]: PkgManagerLintOkEventData;
  [LintEvent.PkgManagerLintFailed]: PkgManagerLintFailedEventData;
  [LintEvent.RuleBegin]: RuleBeginEventData;
  [LintEvent.RuleOk]: RuleOkEventData;
  [LintEvent.RuleFailed]: RuleFailedEventData;
  [LintEvent.RuleError]: RuleErrorEventData;
  [LintEvent.LintBegin]: LintBeginEventData;
  [LintEvent.LintOk]: LintOkEventData;
  [LintEvent.LintFailed]: LintFailedEventData;
};

export type LintFailedEventData = z.infer<typeof LintFailedEventDataSchema>;

export type LintOkEventData = z.infer<typeof LintOkEventDataSchema>;

export type PkgManagerLintBeginEventData = z.infer<
  typeof PkgManagerLintBeginEventDataSchema
>;

export type PkgManagerLintFailedEventData = z.infer<
  typeof PkgManagerLintFailedEventDataSchema
>;

export type PkgManagerLintOkEventData = z.infer<
  typeof PkgManagerLintOkEventDataSchema
>;

export type RuleBeginEventData = RuleEventDataBase;

export type RuleErrorEventData = z.infer<typeof RuleErrorEventDataSchema>;

export type RuleEventDataBase = z.infer<typeof RuleEventDataBaseSchema>;

export type RuleFailedEventData = z.infer<typeof RuleFailedEventDataSchema>;

export type RuleOkEventData = RuleEventDataBase;

export const RuleEventDataBaseSchema = LintManifestSchema.extend({
  rule: NonEmptyStringSchema.describe('ID of the rule to run'),
  config: BaseNormalizedRuleOptionsSchema.describe(
    'Specific rule configuration',
  ),
  currentRule: NonNegativeIntSchema.describe(
    'Current rule position in the total',
  ),
  totalRules: NonNegativeIntSchema.describe('Total count of unique rules'),
}).describe('Base object for RunRule* events');

export const RuleBeginEventDataSchema = RuleEventDataBaseSchema;

export const RuleOkEventDataSchema = RuleEventDataBaseSchema;

export const RuleFailedEventDataSchema = RuleEventDataBaseSchema.extend({
  issues: z
    .array(serializeObject(StaticRuleIssueSchema))
    .describe('List of issues raised by a single rule exection'),
});

export const LintBeginEventDataSchema = z.object({
  config: BaseNormalizedRuleOptionsRecordSchema.describe(
    'The entire rule configuration, as defined by the user and default values',
  ),
  totalRules: NonNegativeIntSchema.describe('Total count of unique rules'),
  totalPkgManagers: NonNegativeIntSchema,
  totalUniquePkgs: NonNegativeIntSchema,
});

export const LintOkEventDataSchema = LintBeginEventDataSchema.extend({
  passed: z
    .array(RuleOkSchema)
    .describe('List of rules which ran without issue'),
});

export const LintFailedEventDataSchema = LintOkEventDataSchema.extend({
  issues: z
    .array(StaticRuleIssueSchema)
    .describe('List of issues raised by all rules'),
});

export const RuleErrorEventDataSchema = z.object({
  error: instanceofSchema(RuleError),
});

export const PkgManagerLintBeginEventDataSchema =
  PkgManagerEventBaseSchema.extend({
    config: BaseNormalizedRuleOptionsRecordSchema.describe(
      'The entire rule configuration, as defined by the user and default values',
    ),
    totalPkgManagerChecks: NonNegativeIntSchema.describe(
      'Total count of rule checks within package manager context',
    ),
    totalRules: NonNegativeIntSchema.describe('Total count of unique rules'),
  });

export const PkgManagerLintOkEventDataSchema =
  PkgManagerLintBeginEventDataSchema.extend({
    passed: z
      .array(RuleOkSchema)
      .describe('List of rules which ran without issue'),
  });

export const PkgManagerLintFailedEventDataSchema =
  PkgManagerLintOkEventDataSchema.extend({
    failed: z
      .array(StaticRuleIssueSchema)
      .describe('List of issues raised by all rules'),
  });
