import {instanceofSchema, NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';
import {RuleSeveritySchema} from './rule-severity';
import {StaticRuleContextSchema, StaticRuleDefSchema} from './rule-static';

/**
 * Schema for a {@link StaticRuleIssue}, which is a {@link RuleIssue} in a
 * serializable format
 */
export const StaticRuleIssueSchema = z.object({
  rule: StaticRuleDefSchema,
  context: StaticRuleContextSchema,
  message: NonEmptyStringSchema.describe(
    'The human-=readable message for this issue',
  ),
  data: z.unknown().optional().describe('Arbitrary data attached to the issue'),
  error: instanceofSchema(Error).optional().describe('An error, if any'),
  id: NonEmptyStringSchema.describe('A unique identifier for this issue'),
  failed: z.boolean().describe('Whether or not this issue is a failure'),
  severity: RuleSeveritySchema.describe(
    'The severity that this rule was run at',
  ),
});

/**
 * Represents a static rule issue, which is a {@link RuleIssue} in a serializable
 * format
 */
export type StaticRuleIssue = z.infer<typeof StaticRuleIssueSchema>;
