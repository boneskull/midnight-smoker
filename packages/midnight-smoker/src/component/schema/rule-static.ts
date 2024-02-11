import {RuleSeveritySchema} from '#schema/rule-severity.js';
import {NonEmptyStringSchema, PackageJsonSchema} from '#util/schema-util.js';
import {z} from 'zod';

export const StaticRuleContextSchema = z
  .object({
    pkgJson: PackageJsonSchema,
    pkgJsonPath: NonEmptyStringSchema,
    installPath: NonEmptyStringSchema,
    severity: RuleSeveritySchema,
  })
  .describe(
    'Static representation of a RuleContext, suitable for serialization',
  );

/**
 * The bits of a {@link RuleContext} suitable for serialization.
 *
 * @public
 */
export type StaticRuleContext = z.infer<typeof StaticRuleContextSchema>;

/**
 * The bits of a {@link RuleDef} suitable for passing the API edge
 */
export const StaticRuleSchema = z
  .object({
    defaultSeverity: RuleSeveritySchema.optional(),
    description: NonEmptyStringSchema,
    name: NonEmptyStringSchema,
    url: NonEmptyStringSchema.optional(),
  })
  .describe('Static representation of a Rule, suitable for serialization');

/**
 * Representation of a rule suitable for serialization into JSON.
 */
export type StaticRule = z.infer<typeof StaticRuleSchema>;
