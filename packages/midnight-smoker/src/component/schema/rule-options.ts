import {createRuleOptionsSchema} from '#rule/create-rule-options';
import {RuleSeveritySchema} from '#schema/rule-severity';
import {EmptyObjectSchema} from '#util/schema-util';
import {z} from 'zod';

export const BaseRuleOptionsSchema = createRuleOptionsSchema(
  EmptyObjectSchema.passthrough(),
);

export const BaseRuleOptionsRecordSchema = z
  .record(BaseRuleOptionsSchema)
  .describe('Rule configuration for automated checks');

export const BaseNormalizedRuleOptionsSchema = z.strictObject({
  severity: RuleSeveritySchema,
  opts: z.object({}).passthrough(),
});

export const BaseNormalizedRuleOptionsRecordSchema = z
  .record(BaseNormalizedRuleOptionsSchema)
  .describe('Rule configuration for automated checks');

export type BaseRuleOptionsRecord = z.input<typeof BaseRuleOptionsRecordSchema>;

export type BaseNormalizedRuleOptions = z.infer<
  typeof BaseNormalizedRuleOptionsSchema
>;

export type BaseNormalizedRuleOptionsRecord = z.infer<
  typeof BaseNormalizedRuleOptionsRecordSchema
>;

/**
 * A schema for a rule's options; this is the {@link RuleDef.schema} prop as
 * defined by a plugin author.
 *
 * The schema must be a {@link z.ZodObject} and each member of the object's shape
 * must either be _optional_ or have a _default_ value.
 *
 * @see {@link https://zod.dev/?id=json-type}
 * @todo There are certain Zod types which we should disallow. The value must be
 *   expressible as JSON.
 *
 * @todo `opts` is disallowed as an option name; probably need a tsd test for it
 *
 * @todo The value of in the shape of the ZodObject needs to accept an input
 *   value of `undefined`.
 *
 * @todo Evaluate whether or not other, non-object types should be allowed as
 *   rule-specific options
 */
export type RuleDefSchemaValue<
  UnknownKeys extends z.UnknownKeysParam = z.UnknownKeysParam,
> = z.ZodObject<Omit<Record<string, z.ZodTypeAny>, 'opts'>, UnknownKeys>;

/**
 * Options for a specific {@link Rule}.
 *
 * @public
 */
export type RuleOptions<Schema extends RuleDefSchemaValue | void> =
  Schema extends RuleDefSchemaValue
    ? z.infer<Schema>
    : z.infer<typeof EmptyObjectSchema>;
