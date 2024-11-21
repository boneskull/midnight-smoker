import {createRuleOptionsSchema} from '#options/create-rule-options';
import {type RuleSchemaValue} from '#schema/lint/rule-schema-value';
import {
  type RuleSeverity,
  RuleSeveritySchema,
} from '#schema/lint/rule-severity';
import {JsonValueSchema} from '#schema/util/json';
import {type EmptyObject} from '#schema/util/util';
import {z} from 'zod';

/**
 * The base type of `SmokerOptions.rules`
 */
export type BaseRuleConfigRecord = Record<string, SomeRuleConfig>;

/**
 * Configuration for a specific {@link Rule}, including
 * {@link RuleSeverity severity} and {@link RuleOptions options}.
 */
export type RuleConfig<Schema extends RuleSchemaValue | void> = {
  opts?: RuleOptions<Schema>;
  severity?: RuleSeverity;
};

/**
 * Options for a specific {@link Rule}.
 *
 * @public
 */
export type RuleOptions<Schema extends RuleSchemaValue | void> =
  Schema extends RuleSchemaValue ? z.infer<Schema> : EmptyObject;

/**
 * Generic rule configuration, including {@link SomeRuleOptions options} and
 * {@link RuleSeverity severity}.
 */
export type SomeRuleConfig = {
  opts: SomeRuleOptions;
  severity: RuleSeverity;
};

/**
 * Generic, normalized rule options
 */
export type SomeRuleOptions = Record<string, unknown>;

export const SomeRuleOptionsSchema: RuleSchemaValue = z
  .object({})
  .catchall(JsonValueSchema)
  .describe('Generic rule options');

export const RawRuleOptionsSchema = createRuleOptionsSchema(
  SomeRuleOptionsSchema,
);

export const RawRuleOptionsRecordSchema = z
  .record(RawRuleOptionsSchema)
  .describe('Rule configuration for linting');

export const BaseRuleConfigSchema = z.strictObject({
  opts: SomeRuleOptionsSchema,
  severity: RuleSeveritySchema,
});
