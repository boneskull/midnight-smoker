import {RuleSeveritySchema} from '#schema/rule-severity';
import {EmptyObjectSchema} from '#util/schema-util';
import {z} from 'zod';
import {createRuleOptionsSchema} from './create-rule-options';
import {type RuleDefSchemaValue} from './rule-def-schema-value';

export type BaseRuleConfigRecord = z.infer<typeof BaseRuleConfigRecordSchema>;

export type RuleConfig<Schema extends RuleDefSchemaValue | void> = {
  severity?: z.infer<typeof RuleSeveritySchema>;
  opts?: Schema extends RuleDefSchemaValue
    ? RuleOptions<Schema>
    : z.infer<typeof EmptyObjectSchema>;
};

/**
 * Options for a specific {@link Rule}.
 *
 * @public
 */
export type RuleOptions<Schema extends RuleDefSchemaValue | void> =
  Schema extends RuleDefSchemaValue
    ? z.infer<Schema>
    : z.infer<typeof EmptyObjectSchema>;

export type SomeRuleConfig = z.infer<typeof BaseRuleConfigSchema>;

export type SomeRuleOptions = z.infer<typeof SomeRuleOptionsSchema>;

export const SomeRuleOptionsSchema = EmptyObjectSchema.passthrough();

export const RawRuleOptionsSchema = createRuleOptionsSchema(
  SomeRuleOptionsSchema,
);

export const RawRuleOptionsRecordSchema = z
  .record(RawRuleOptionsSchema)
  .describe('Rule configuration for automated checks');

export const BaseRuleConfigSchema = z.strictObject({
  severity: RuleSeveritySchema,
  opts: SomeRuleOptionsSchema,
});

export const BaseRuleConfigRecordSchema = z
  .record(BaseRuleConfigSchema)
  .describe('Rule configuration for automated checks');
