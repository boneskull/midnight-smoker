import {RuleError} from '#error/rule-error';
import {LintEvent} from '#event';
import {LintManifestSchema} from '#schema/lint-manifest';
import {LintResultSchema} from '#schema/lint-result';
import {PkgManagerEventBaseSchema} from '#schema/pkg-manager-event';
import {
  BaseNormalizedRuleOptionsRecordSchema,
  BaseNormalizedRuleOptionsSchema,
} from '#schema/rule-options';
import {RuleResultFailedSchema, RuleResultSchema} from '#schema/rule-result';
import {StaticPkgManagerSpecSchema} from '#schema/static-pkg-manager-spec';
import {
  NonEmptyStringSchema,
  NonNegativeIntSchema,
  instanceofSchema,
  serializeObject,
} from '#util/schema-util';
import {z} from 'zod';

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
  pkgManager: StaticPkgManagerSpecSchema,
}).describe('Base object for RunRule* events');

export const RuleBeginEventDataSchema = RuleEventDataBaseSchema;

export const RuleOkEventDataSchema = RuleEventDataBaseSchema;

export const RuleFailedEventDataSchema = RuleEventDataBaseSchema.extend({
  issues: z
    .array(serializeObject(RuleResultFailedSchema))
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

export const LintEndEventDataSchema = LintBeginEventDataSchema.extend({
  result: LintResultSchema,
});

export const LintOkEventDataSchema = LintEndEventDataSchema;

export const LintFailedEventDataSchema = LintEndEventDataSchema;

export const RuleErrorEventDataSchema = z.object({
  error: instanceofSchema(RuleError),
});

export const PkgManagerLintBeginEventDataSchema =
  PkgManagerEventBaseSchema.extend({
    totalPkgManagerChecks: NonNegativeIntSchema.describe(
      'Total count of rule checks within package manager context',
    ),
    totalRules: NonNegativeIntSchema.describe('Total count of unique rules'),
  });

export const PkgManagerLintEndEventDataSchema =
  PkgManagerLintBeginEventDataSchema.extend({
    issues: z
      .array(RuleResultFailedSchema)
      .describe('List of issues raised by all rules'),
    passed: z
      .array(RuleResultSchema)
      .describe('List of rules which ran without issue'),
  });

export const PkgManagerLintOkEventDataSchema = PkgManagerLintEndEventDataSchema;

export const PkgManagerLintFailedEventDataSchema =
  PkgManagerLintEndEventDataSchema;

export const LintEventSchemas = {
  [LintEvent.PkgManagerLintBegin]: PkgManagerLintBeginEventDataSchema,
  [LintEvent.PkgManagerLintOk]: PkgManagerLintOkEventDataSchema,
  [LintEvent.PkgManagerLintFailed]: PkgManagerLintFailedEventDataSchema,
  [LintEvent.RuleBegin]: RuleBeginEventDataSchema,
  [LintEvent.RuleOk]: RuleOkEventDataSchema,
  [LintEvent.RuleFailed]: RuleFailedEventDataSchema,
  [LintEvent.RuleError]: RuleErrorEventDataSchema,
  [LintEvent.LintBegin]: LintBeginEventDataSchema,
  [LintEvent.LintOk]: LintOkEventDataSchema,
  [LintEvent.LintFailed]: LintFailedEventDataSchema,
} as const;
