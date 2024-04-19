import {RuleSeveritySchema} from '#schema/rule-severity';
import {NonEmptyStringSchema, instanceofSchema} from '#util/schema-util';
import {z} from 'zod';
import {StaticRuleContextSchema, StaticRuleDefSchema} from './rule-static';

/**
 * Represents the result of running a rule which has failed
 */
export type RuleResultFailed = z.infer<typeof RuleResultFailedSchema>;

/**
 * Represents the result of running a rule which has not failed
 */
export type RuleResultOk = z.infer<typeof RuleResultOkSchema>;

export const RuleResultSchema = z.object({
  rule: StaticRuleDefSchema,
  context: StaticRuleContextSchema,
});

export const RuleResultOkSchema = RuleResultSchema;

export const RuleResultFailedSchema = RuleResultSchema.extend({
  message: NonEmptyStringSchema.describe(
    'The human-readable message for this issue',
  ),
  data: z
    .unknown()
    .optional()
    .describe('Arbitrary metadata attached to the issue'),
  error: instanceofSchema(Error).optional().describe('An error, if any'),
  id: NonEmptyStringSchema.describe('A unique identifier for this issue'),
  failed: z
    .boolean()
    .describe(
      'Whether or not this issue is at severity "error", which should cause a non-zero exit code',
    ),
  severity: RuleSeveritySchema.describe(
    'The severity that this rule was run at',
  ),
  pkgManager: NonEmptyStringSchema.describe(
    'String representation of the current pkg manager',
  ),
});
